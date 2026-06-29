from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    GEMINI_API_KEY: str = ""
    LLM_MODEL: str = "gemini-2.0-flash"
    EMBEDDING_MODEL: str = "models/text-embedding-004"   # 768-dim Gemini embedding
    DATABASE_URL: str = "postgresql://askkmitl:askkmitl_dev@localhost:5432/askkmitl"
    VECTOR_BACKEND: str = "pgvector"
    HASH_SALT: str = "dev_salt_change_in_prod"
    SESSION_SECRET: str = "dev_session_secret_change_in_prod"
    APP_ORIGIN: str = "http://localhost:3000"


settings = Settings()
