import logging
import os
import sqlite3
from typing import Optional
from sqlalchemy.orm import Session
import base64
import io


from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import Response, StreamingResponse, FileResponse
from pydantic import BaseModel, ConfigDict


from open_webui.models.auths import Auths
from open_webui.models.oauth_sessions import OAuthSessions

from open_webui.models.groups import Groups
from open_webui.models.chats import Chats
from open_webui.models.users import (
    UserModel,
    UserGroupIdsModel,
    UserGroupIdsListResponse,
    UserInfoResponse,
    UserInfoListResponse,
    UserRoleUpdateForm,
    UserStatus,
    Users,
    UserSettings,
    UserUpdateForm,
)

from open_webui.constants import ERROR_MESSAGES
from open_webui.env import STATIC_DIR
from open_webui.internal.db import get_session


from open_webui.utils.auth import (
    get_admin_user,
    get_password_hash,
    get_verified_user,
    validate_password,
)
from open_webui.utils.access_control import get_permissions, has_permission

log = logging.getLogger(__name__)

router = APIRouter()


# ── P27-21: CE password-reset hierarchy helpers ───────────────────────────────

def _ce_rank_for_owui_user(owui_user_id: str, ce_db_path: str) -> int:
    """
    Returns the CE authority rank for the given OWUI user ID.
      3 = System Admin,  2 = Admin,  1 = Detective,  0 = not found in CE.
    Opens the CE SQLite DB read-only. Returns 0 on any error (fail-open handled by caller).
    """
    try:
        con = sqlite3.connect(f"file:{ce_db_path}?mode=ro", uri=True, timeout=2)
        row = con.execute(
            "SELECT role, is_system_admin FROM case_engine_users WHERE owui_user_id = ? LIMIT 1",
            (owui_user_id,),
        ).fetchone()
        con.close()
        if not row:
            return 0
        role, is_sa = row
        if is_sa:
            return 3
        if role == "admin":
            return 2
        return 1
    except Exception:
        return 0  # DB unavailable — caller decides whether to fail-open


def _check_ce_password_reset_hierarchy(actor_owui_id: str, target_owui_id: str) -> None:
    """
    P27-21 (corrected): Enforces CE hierarchy for cross-user password reset.
    Self-reset is always allowed.
    Cross-user reset fails CLOSED: if CE authority (CE_DB_PATH) is missing or unreadable,
    the reset is denied with 503 rather than allowed through.
    Raises HTTP 403 when actor does not outrank target; 503 when CE authority is unavailable.
    """
    if actor_owui_id == target_owui_id:
        return  # self-reset always permitted

    ce_db_path = os.environ.get("CE_DB_PATH", "").strip()
    if not ce_db_path:
        # Fail closed: CE authority is required for cross-user password reset.
        # CE_DB_PATH must be configured to match the Case Engine DB_PATH.
        log.error(
            "P27-21: CE_DB_PATH not set — cross-user password reset denied (fail-closed). "
            "Set CE_DB_PATH to match the Case Engine DB_PATH."
        )
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Case Engine authority not configured — cross-user password reset unavailable",
        )

    actor_rank = _ce_rank_for_owui_user(actor_owui_id, ce_db_path)
    target_rank = _ce_rank_for_owui_user(target_owui_id, ce_db_path)

    # Users not in CE are treated as detective (rank 1).
    if actor_rank == 0:
        actor_rank = 1
    if target_rank == 0:
        target_rank = 1

    if actor_rank <= target_rank:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient authority: cannot reset password for a user with equal or higher rank",
        )


############################
# GetUsers
############################


PAGE_ITEM_COUNT = 30


@router.get("/", response_model=UserGroupIdsListResponse)
async def get_users(
    query: Optional[str] = None,
    order_by: Optional[str] = None,
    direction: Optional[str] = None,
    page: Optional[int] = 1,
    user=Depends(get_admin_user),
    db: Session = Depends(get_session),
):
    limit = PAGE_ITEM_COUNT

    page = max(1, page)
    skip = (page - 1) * limit

    filter = {}
    if query:
        filter["query"] = query
    if order_by:
        filter["order_by"] = order_by
    if direction:
        filter["direction"] = direction

    filter["direction"] = direction

    result = Users.get_users(filter=filter, skip=skip, limit=limit, db=db)

    users = result["users"]
    total = result["total"]

    # Fetch groups for all users in a single query to avoid N+1
    user_ids = [user.id for user in users]
    user_groups = Groups.get_groups_by_member_ids(user_ids, db=db)

    return {
        "users": [
            UserGroupIdsModel(
                **{
                    **user.model_dump(),
                    "group_ids": [group.id for group in user_groups.get(user.id, [])],
                }
            )
            for user in users
        ],
        "total": total,
    }


@router.get("/all", response_model=UserInfoListResponse)
async def get_all_users(
    user=Depends(get_admin_user),
    db: Session = Depends(get_session),
):
    return Users.get_users(db=db)


@router.get("/search", response_model=UserInfoListResponse)
async def search_users(
    query: Optional[str] = None,
    order_by: Optional[str] = None,
    direction: Optional[str] = None,
    page: Optional[int] = 1,
    user=Depends(get_verified_user),
    db: Session = Depends(get_session),
):
    limit = PAGE_ITEM_COUNT

    page = max(1, page)
    skip = (page - 1) * limit

    filter = {}
    if query:
        filter["query"] = query
    if order_by:
        filter["order_by"] = order_by
    if direction:
        filter["direction"] = direction

    return Users.get_users(filter=filter, skip=skip, limit=limit, db=db)


############################
# User Groups
############################


@router.get("/groups")
async def get_user_groups(
    user=Depends(get_verified_user), db: Session = Depends(get_session)
):
    return Groups.get_groups_by_member_id(user.id, db=db)


############################
# User Permissions
############################


@router.get("/permissions")
async def get_user_permissisions(
    request: Request,
    user=Depends(get_verified_user),
    db: Session = Depends(get_session),
):
    user_permissions = get_permissions(
        user.id, request.app.state.config.USER_PERMISSIONS, db=db
    )

    return user_permissions


############################
# User Default Permissions
############################
class WorkspacePermissions(BaseModel):
    models: bool = False
    knowledge: bool = False
    prompts: bool = False
    tools: bool = False
    skills: bool = False
    models_import: bool = False
    models_export: bool = False
    prompts_import: bool = False
    prompts_export: bool = False
    tools_import: bool = False
    tools_export: bool = False


class SharingPermissions(BaseModel):
    models: bool = False
    public_models: bool = False
    knowledge: bool = False
    public_knowledge: bool = False
    prompts: bool = False
    public_prompts: bool = False
    tools: bool = False
    public_tools: bool = True
    skills: bool = False
    public_skills: bool = False
    notes: bool = False
    public_notes: bool = True


class AccessGrantsPermissions(BaseModel):
    allow_users: bool = True


class ChatPermissions(BaseModel):
    controls: bool = True
    valves: bool = True
    system_prompt: bool = True
    params: bool = True
    file_upload: bool = True
    web_upload: bool = True
    delete: bool = True
    delete_message: bool = True
    continue_response: bool = True
    regenerate_response: bool = True
    rate_response: bool = True
    edit: bool = True
    share: bool = True
    export: bool = True
    stt: bool = True
    tts: bool = True
    call: bool = True
    multiple_models: bool = True
    temporary: bool = True
    temporary_enforced: bool = False


class FeaturesPermissions(BaseModel):
    api_keys: bool = False
    notes: bool = True
    channels: bool = True
    folders: bool = True
    direct_tool_servers: bool = False

    web_search: bool = True
    image_generation: bool = True
    code_interpreter: bool = True
    memories: bool = True


class SettingsPermissions(BaseModel):
    interface: bool = True


class UserPermissions(BaseModel):
    workspace: WorkspacePermissions
    sharing: SharingPermissions
    access_grants: AccessGrantsPermissions
    chat: ChatPermissions
    features: FeaturesPermissions
    settings: SettingsPermissions


@router.get("/default/permissions", response_model=UserPermissions)
async def get_default_user_permissions(request: Request, user=Depends(get_admin_user)):
    return {
        "workspace": WorkspacePermissions(
            **request.app.state.config.USER_PERMISSIONS.get("workspace", {})
        ),
        "sharing": SharingPermissions(
            **request.app.state.config.USER_PERMISSIONS.get("sharing", {})
        ),
        "access_grants": AccessGrantsPermissions(
            **request.app.state.config.USER_PERMISSIONS.get("access_grants", {})
        ),
        "chat": ChatPermissions(
            **request.app.state.config.USER_PERMISSIONS.get("chat", {})
        ),
        "features": FeaturesPermissions(
            **request.app.state.config.USER_PERMISSIONS.get("features", {})
        ),
        "settings": SettingsPermissions(
            **request.app.state.config.USER_PERMISSIONS.get("settings", {})
        ),
    }


@router.post("/default/permissions")
async def update_default_user_permissions(
    request: Request, form_data: UserPermissions, user=Depends(get_admin_user)
):
    request.app.state.config.USER_PERMISSIONS = form_data.model_dump()
    return request.app.state.config.USER_PERMISSIONS


############################
# GetUserSettingsBySessionUser
############################


@router.get("/user/settings", response_model=Optional[UserSettings])
async def get_user_settings_by_session_user(
    user=Depends(get_verified_user), db: Session = Depends(get_session)
):
    user = Users.get_user_by_id(user.id, db=db)
    if user:
        return user.settings
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=ERROR_MESSAGES.USER_NOT_FOUND,
        )


############################
# UpdateUserSettingsBySessionUser
############################


@router.post("/user/settings/update", response_model=UserSettings)
async def update_user_settings_by_session_user(
    request: Request,
    form_data: UserSettings,
    user=Depends(get_verified_user),
    db: Session = Depends(get_session),
):
    updated_user_settings = form_data.model_dump()
    ui_settings = updated_user_settings.get("ui")

    # Harden settings updates to support partial UI payloads. This prevents
    # hidden/legacy keys from being rewritten when only visible controls change.
    existing_user = Users.get_user_by_id(user.id, db=db)
    existing_settings = existing_user.settings if existing_user and existing_user.settings else {}

    if ui_settings is not None:
        existing_ui_settings = (
            existing_settings.get("ui", {}) if isinstance(existing_settings, dict) else {}
        )
        if not isinstance(existing_ui_settings, dict):
            existing_ui_settings = {}

        if not isinstance(ui_settings, dict):
            ui_settings = {}

        updated_user_settings["ui"] = {**existing_ui_settings, **ui_settings}
        ui_settings = updated_user_settings["ui"]
    if (
        user.role != "admin"
        and ui_settings is not None
        and "toolServers" in ui_settings.keys()
        and not has_permission(
            user.id,
            "features.direct_tool_servers",
            request.app.state.config.USER_PERMISSIONS,
        )
    ):
        # If the user is not an admin and does not have permission to use tool servers, remove the key
        updated_user_settings["ui"].pop("toolServers", None)

    user = Users.update_user_settings_by_id(user.id, updated_user_settings, db=db)
    if user:
        return user.settings
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=ERROR_MESSAGES.USER_NOT_FOUND,
        )


############################
# GetUserStatusBySessionUser
############################


@router.get("/user/status")
async def get_user_status_by_session_user(
    request: Request,
    user=Depends(get_verified_user),
    db: Session = Depends(get_session),
):
    if not request.app.state.config.ENABLE_USER_STATUS:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=ERROR_MESSAGES.ACTION_PROHIBITED,
        )
    user = Users.get_user_by_id(user.id, db=db)
    if user:
        return user
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=ERROR_MESSAGES.USER_NOT_FOUND,
        )


############################
# UpdateUserStatusBySessionUser
############################


@router.post("/user/status/update")
async def update_user_status_by_session_user(
    request: Request,
    form_data: UserStatus,
    user=Depends(get_verified_user),
    db: Session = Depends(get_session),
):
    if not request.app.state.config.ENABLE_USER_STATUS:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=ERROR_MESSAGES.ACTION_PROHIBITED,
        )
    user = Users.get_user_by_id(user.id, db=db)
    if user:
        user = Users.update_user_status_by_id(user.id, form_data, db=db)
        return user
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=ERROR_MESSAGES.USER_NOT_FOUND,
        )


############################
# GetUserInfoBySessionUser
############################


@router.get("/user/info", response_model=Optional[dict])
async def get_user_info_by_session_user(
    user=Depends(get_verified_user), db: Session = Depends(get_session)
):
    user = Users.get_user_by_id(user.id, db=db)
    if user:
        return user.info
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=ERROR_MESSAGES.USER_NOT_FOUND,
        )


############################
# UpdateUserInfoBySessionUser
############################


@router.post("/user/info/update", response_model=Optional[dict])
async def update_user_info_by_session_user(
    form_data: dict, user=Depends(get_verified_user), db: Session = Depends(get_session)
):
    user = Users.get_user_by_id(user.id, db=db)
    if user:
        if user.info is None:
            user.info = {}

        user = Users.update_user_by_id(
            user.id, {"info": {**user.info, **form_data}}, db=db
        )
        if user:
            return user.info
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=ERROR_MESSAGES.USER_NOT_FOUND,
            )
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=ERROR_MESSAGES.USER_NOT_FOUND,
        )


############################
# GetUserById
############################


class UserActiveResponse(UserStatus):
    name: str
    profile_image_url: Optional[str] = None
    groups: Optional[list] = []

    is_active: bool
    model_config = ConfigDict(extra="allow")


@router.get("/{user_id}", response_model=UserActiveResponse)
async def get_user_by_id(
    user_id: str, user=Depends(get_admin_user), db: Session = Depends(get_session)
):
    # Check if user_id is a shared chat
    # If it is, get the user_id from the chat
    if user_id.startswith("shared-"):
        chat_id = user_id.replace("shared-", "")
        chat = Chats.get_chat_by_id(chat_id)
        if chat:
            user_id = chat.user_id
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=ERROR_MESSAGES.USER_NOT_FOUND,
            )

    user = Users.get_user_by_id(user_id, db=db)
    if user:
        groups = Groups.get_groups_by_member_id(user_id, db=db)
        return UserActiveResponse(
            **{
                **user.model_dump(),
                "groups": [{"id": group.id, "name": group.name} for group in groups],
                "is_active": Users.is_user_active(user_id, db=db),
            }
        )
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=ERROR_MESSAGES.USER_NOT_FOUND,
        )


@router.get("/{user_id}/info", response_model=UserInfoResponse)
async def get_user_info_by_id(
    user_id: str, user=Depends(get_verified_user), db: Session = Depends(get_session)
):
    user = Users.get_user_by_id(user_id, db=db)
    if user:
        groups = Groups.get_groups_by_member_id(user_id, db=db)
        return UserInfoResponse(
            **{
                **user.model_dump(),
                "groups": [{"id": group.id, "name": group.name} for group in groups],
                "is_active": Users.is_user_active(user_id, db=db),
            }
        )
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=ERROR_MESSAGES.USER_NOT_FOUND,
        )


@router.get("/{user_id}/oauth/sessions")
async def get_user_oauth_sessions_by_id(
    user_id: str, user=Depends(get_admin_user), db: Session = Depends(get_session)
):
    sessions = OAuthSessions.get_sessions_by_user_id(user_id, db=db)
    if sessions and len(sessions) > 0:
        return sessions
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=ERROR_MESSAGES.USER_NOT_FOUND,
        )


############################
# GetUserProfileImageById
############################


@router.get("/{user_id}/profile/image")
def get_user_profile_image_by_id(user_id: str, user=Depends(get_verified_user)):
    user = Users.get_user_by_id(user_id)
    if user:
        if user.profile_image_url:
            # check if it's url or base64
            if user.profile_image_url.startswith("http"):
                return Response(
                    status_code=status.HTTP_302_FOUND,
                    headers={"Location": user.profile_image_url},
                )
            elif user.profile_image_url.startswith("data:image"):
                try:
                    header, base64_data = user.profile_image_url.split(",", 1)
                    image_data = base64.b64decode(base64_data)
                    image_buffer = io.BytesIO(image_data)
                    media_type = header.split(";")[0].lstrip("data:")

                    return StreamingResponse(
                        image_buffer,
                        media_type=media_type,
                        headers={"Content-Disposition": "inline"},
                    )
                except Exception as e:
                    pass
        return FileResponse(f"{STATIC_DIR}/user.png")
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=ERROR_MESSAGES.USER_NOT_FOUND,
        )


############################
# GetUserActiveStatusById
############################


@router.get("/{user_id}/active", response_model=dict)
async def get_user_active_status_by_id(
    user_id: str, user=Depends(get_verified_user), db: Session = Depends(get_session)
):
    return {
        "active": Users.is_user_active(user_id, db=db),
    }


############################
# UpdateUserById
############################


@router.post("/{user_id}/update", response_model=Optional[UserModel])
async def update_user_by_id(
    user_id: str,
    form_data: UserUpdateForm,
    session_user=Depends(get_admin_user),
    db: Session = Depends(get_session),
):
    # Prevent modification of the primary admin user by other admins
    try:
        first_user = Users.get_first_user(db=db)
        if first_user:
            if user_id == first_user.id:
                if session_user.id != user_id:
                    # If the user trying to update is the primary admin, and they are not the primary admin themselves
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail=ERROR_MESSAGES.ACTION_PROHIBITED,
                    )

                if form_data.role != "admin":
                    # If the primary admin is trying to change their own role, prevent it
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail=ERROR_MESSAGES.ACTION_PROHIBITED,
                    )

    except Exception as e:
        log.error(f"Error checking primary admin status: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not verify primary admin status.",
        )

    user = Users.get_user_by_id(user_id, db=db)

    if user:
        if form_data.email.lower() != user.email:
            email_user = Users.get_user_by_email(form_data.email.lower(), db=db)
            if email_user:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=ERROR_MESSAGES.EMAIL_TAKEN,
                )

        if form_data.password:
            # P27-21: Hierarchy check before hashing — actor must outrank target in CE.
            _check_ce_password_reset_hierarchy(session_user.id, user_id)

            try:
                validate_password(form_data.password)
            except Exception as e:
                raise HTTPException(400, detail=str(e))

            hashed = get_password_hash(form_data.password)
            Auths.update_user_password_by_id(user_id, hashed, db=db)

        Auths.update_email_by_id(user_id, form_data.email.lower(), db=db)
        updated_user = Users.update_user_by_id(
            user_id,
            {
                "role": form_data.role,
                "name": form_data.name,
                "email": form_data.email.lower(),
                "profile_image_url": form_data.profile_image_url,
            },
            db=db,
        )

        if updated_user:
            return updated_user

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=ERROR_MESSAGES.DEFAULT(),
        )

    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail=ERROR_MESSAGES.USER_NOT_FOUND,
    )


############################
# DeleteUserById
############################


@router.delete("/{user_id}", response_model=bool)
async def delete_user_by_id(
    user_id: str, user=Depends(get_admin_user), db: Session = Depends(get_session)
):
    # Prevent deletion of the primary admin user
    try:
        first_user = Users.get_first_user(db=db)
        if first_user and user_id == first_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=ERROR_MESSAGES.ACTION_PROHIBITED,
            )
    except Exception as e:
        log.error(f"Error checking primary admin status: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not verify primary admin status.",
        )

    if user.id != user_id:
        result = Auths.delete_auth_by_id(user_id, db=db)

        if result:
            return True

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=ERROR_MESSAGES.DELETE_USER_ERROR,
        )

    # Prevent self-deletion
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail=ERROR_MESSAGES.ACTION_PROHIBITED,
    )


############################
# GetUserGroupsById
############################


@router.get("/{user_id}/groups")
async def get_user_groups_by_id(
    user_id: str, user=Depends(get_admin_user), db: Session = Depends(get_session)
):
    return Groups.get_groups_by_member_id(user_id, db=db)
