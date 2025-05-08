from fastapi import FastAPI, HTTPException, Depends, status
from pydantic import BaseModel
import hashlib
import sqlite3
import uvicorn
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from datetime import datetime, timedelta
from jose import jwt, JWTError
import os
import requests
from starlette.responses import RedirectResponse, HTMLResponse
from fastapi import Request
from dotenv import load_dotenv

from schemas import User, Token, TokenRefresh
from database import Database

# Constants
load_dotenv()
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.environ.get("ACCESS_TOKEN_EXPIRE_MINUTES", 1))
REFRESH_TOKEN_EXPIRE_DAYS = int(os.environ.get("REFRESH_TOKEN_EXPIRE_DAYS", 1))
SECRET_KEY = os.environ["SECRET_KEY"]
ALGORITHM = os.environ.get("ALGORITHM", "HS256")
GOOGLE_CLIENT_ID = os.environ["GOOGLE_CLIENT_ID"]
GOOGLE_CLIENT_SECRET = os.environ["GOOGLE_CLIENT_SECRET"]
GOOGLE_AUTH_URI = os.environ.get("GOOGLE_AUTH_URI", "https://accounts.google.com/o/oauth2/v2/auth")
GOOGLE_TOKEN_URI = os.environ.get("GOOGLE_TOKEN_URI", "https://oauth2.googleapis.com/token")
GOOGLE_USERINFO_URI = os.environ.get("GOOGLE_USERINFO_URI", "https://www.googleapis.com/oauth2/v3/userinfo")
REDIRECT_URI = os.environ["REDIRECT_URI"]
FRONTEND_URL = os.environ["FRONTEND_URL"]

#  Setup
app = FastAPI(
    title="JWT + HASH example",
    description="API for authentication and authorization",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)
#asdasdsad
app.swagger_ui_parameters = {
    "usePkceWithAuthorizationCodeGrant": True,
    "clientId": "your-client-id",
}

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



# Methods


async def hash_password(password: str):
    return hashlib.sha256(password.encode()).hexdigest()

async def verify_password(password: str, hashed_password: str):
    return hashlib.sha256(password.encode()).hexdigest() == hashed_password

async def create_token(data: dict):
    access_token_expires = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    refresh_token_expires = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)

    access_token_data = {
        "sub": data["sub"],
        "exp": access_token_expires,
        "type": "access",
    }
    access_token = jwt.encode(access_token_data, SECRET_KEY, algorithm=ALGORITHM)

    refresh_token_data = {
        "sub": data["sub"],
        "exp": refresh_token_expires,
        "type": "refresh",
    }
    refresh_token = jwt.encode(refresh_token_data, SECRET_KEY, algorithm=ALGORITHM)
    
    return access_token, refresh_token


# Routes
@app.post("/api/register")
async def register(user: User):
    if await db.get_user(user.username):
        raise HTTPException(
            status_code=400,
            detail="User already exists"
        )
    
    await db.add_user(user.username, await hash_password(user.password))
    return {"message": "User registered successfully"}


@app.post("/api/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user = await db.get_user(form_data.username)
    if not user or not await verify_password(form_data.password, user["password_hashed"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token, refresh_token = await create_token(data={"sub": user["username"]})
    return {"access_token": access_token, "refresh_token": refresh_token, "token_type": "bearer"}


@app.get("/api/example")
async def example(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        return {"message": "Token is valid", "username": username}
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    

@app.post("/api/refresh", response_model=Token,
    responses={
        401: {"description": "Invalid refresh token"},
        200: {
            "description": "Successfully refreshed tokens",
            "content": {
                "application/json": {
                    "example": {
                        "access_token": "eyJhbGciOiJIUzI1...",
                        "refresh_token": "eyJhbGciOiJIUzI1...",
                        "token_type": "bearer"
                    }
                }
            }
        }
    },
    # Добавляем описание для Swagger UI
    openapi_extra={
        "requestBody": {
            "content": {
                "application/json": {
                    "schema": {
                        "type": "object",
                        "properties": {
                            "refresh_token": {
                                "type": "string",
                                "description": "Refresh token полученный при логине"
                            }
                        },
                        "required": ["refresh_token"]
                    },
                    "example": {
                        "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    }
                }
            }
        }
    }
)
async def refresh_jwt_token(token_data: TokenRefresh):
    try:
        payload = jwt.decode(token_data.refresh_token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        
        username = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=401, detail="Invalid refresh token")
        
        new_access_token, new_refresh_token = await create_token(data={"sub": username})
        return {
            "access_token": new_access_token,
            "refresh_token": new_refresh_token,
            "token_type": "bearer"}
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    

@app.delete("/api/delete")
async def delete_user(username: str, token: str = Depends(oauth2_scheme)):
    try:
        # Проверяем токен
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        token_username = payload.get("sub")
        
        # Проверяем права (пользователь может удалить только себя)
        if token_username != username:
            raise HTTPException(status_code=403, detail="Not authorized to delete this user")
        
        # Проверяем существование пользователя
        user = await db.get_user(username)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
            
        await db.delete_user(username)
        return {"message": "User deleted successfully"}
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")


@app.put("/api/edit")
async def edit_user(username: str, password: str, token: str = Depends(oauth2_scheme)):
    try:
        # Проверяем токен
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        token_username = payload.get("sub")
        
        # Проверяем права (пользователь может редактировать только себя)
        if token_username != username:
            raise HTTPException(status_code=403, detail="Not authorized to edit this user")
            
        # Проверяем существование пользователя
        user = await db.get_user(username)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
            
        await db.edit_user(username, await hash_password(password))
        return {"message": "User edited successfully"}
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")


@app.get("/api/login/google")
async def google_login():
    """
    Redirects the user to the Google OAuth2 consent screen.
    """
    params = {
        "client_id": GOOGLE_CLIENT_ID,
        "response_type": "code",
        "redirect_uri": REDIRECT_URI,
        "scope": "openid email profile",
        "access_type": "offline",
        "prompt": "consent"
    }
    # Build the full URL
    request_url = requests.Request("GET", GOOGLE_AUTH_URI, params=params).prepare().url
    return RedirectResponse(request_url)

@app.get("/api/login/google/callback")
async def google_callback(request: Request, code: str = None):
    """
    Handles the OAuth2 callback from Google.
    """
    if not code:
        return RedirectResponse(f"{FRONTEND_URL}/login?error=NoCodeProvided")

    # Exchange the code for tokens
    data = {
        "code": code,
        "client_id": GOOGLE_CLIENT_ID,
        "client_secret": GOOGLE_CLIENT_SECRET,
        "redirect_uri": REDIRECT_URI,
        "grant_type": "authorization_code"
    }
    token_response = requests.post(GOOGLE_TOKEN_URI, data=data)
    if token_response.status_code != 200:
        return RedirectResponse(f"{FRONTEND_URL}/login?error=TokenFetchFailed")

    tokens = token_response.json()
    access_token = tokens.get("access_token", None)
    id_token = tokens.get("id_token", None)

    if not access_token or not id_token:
        return RedirectResponse(f"{FRONTEND_URL}/login?error=InvalidTokenResponse")

    # Fetch user info
    user_info_resp = requests.get(
        GOOGLE_USERINFO_URI,
        headers={"Authorization": f"Bearer {access_token}"}
    )
    if user_info_resp.status_code != 200:
        return RedirectResponse(f"{FRONTEND_URL}/login?error=UserInfoFetchFailed")

    user_info = user_info_resp.json()
    email = user_info.get("email")
    if not email:
        return RedirectResponse(f"{FRONTEND_URL}/login?error=NoEmailProvided")

    # Check if user is in DB or create a new one
    db_user = await db.get_user(email)
    if not db_user:
        # You could store an empty password, or any arbitrary string
        await db.add_user(email, await hash_password(""))
        db_user = await db.get_user(email)

    # Create JWT tokens
    access_token_jwt, refresh_token_jwt = await create_token(data={"sub": email})

    # Перенаправление на фронтенд с токенами в параметрах
    redirect_url = f"{FRONTEND_URL}/example?access_token={access_token_jwt}&refresh_token={refresh_token_jwt}"
    return RedirectResponse(redirect_url)


if __name__ == "__main__":
    db = Database() 
    uvicorn.run(app, host="0.0.0.0", port=8000)

