import sqlite3
import asyncio


class Database:
    def __init__(self):
        self.conn = sqlite3.connect("users.db")
        self.c = self.conn.cursor()
        self.c.execute("CREATE TABLE IF NOT EXISTS users (username TEXT PRIMARY KEY, password_hashed TEXT)")
        self.conn.commit()
        self.conn.close()

    def close(self):
        self.conn.close()
        
    async def add_user(self, username: str, password_hashed: str):
        conn = sqlite3.connect("users.db")
        c = conn.cursor()
        c.execute("INSERT INTO users (username, password_hashed) VALUES (?, ?)", (username, password_hashed))
        conn.commit()
        conn.close()
        
    async def get_user(self, username: str):
        conn = sqlite3.connect("users.db")
        c = conn.cursor()
        c.execute("SELECT username, password_hashed FROM users WHERE username=?", (username,))
        user = c.fetchone()
        conn.close()
        if user:
            return {"username": user[0], "password_hashed": user[1]}
        
    async def edit_user(self, username: str, password_hashed: str):
        try:
            conn = sqlite3.connect("users.db")
            c = conn.cursor()
            c.execute("UPDATE users SET password_hashed=? WHERE username=?", (password_hashed, username))
            if c.rowcount == 0:
                raise ValueError("User not found")
            conn.commit()
        except sqlite3.Error as e:
            raise Exception(f"Database error: {str(e)}")
        finally:
            conn.close()

    async def delete_user(self, username: str):
        try:
            conn = sqlite3.connect("users.db")
            c = conn.cursor()
            c.execute("DELETE FROM users WHERE username=?", (username,))
            if c.rowcount == 0:
                raise ValueError("User not found")
            conn.commit()
        except sqlite3.Error as e:
            raise Exception(f"Database error: {str(e)}")
        finally:
            conn.close()
