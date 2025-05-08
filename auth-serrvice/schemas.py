from pydantic import BaseModel, EmailStr
from datetime import date

class User(BaseModel):
    username: str
    password: str
    email: EmailStr
    date_of_birth: date

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str
    
class TokenRefresh(BaseModel):
    refresh_token: str
