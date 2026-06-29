from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    LLM_API_KEY: str = ""
    LLM_MODEL: str = "claude-sonnet-4-6"
    EMBEDDING_MODEL: str = "text-embedding-3-small"
    DATABASE_URL: str = "postgresql://askkmitl:askkmitl_dev@localhost:5432/askkmitl"
    VECTOR_BACKEND: str = "pgvector"
    HASH_SALT: str = "dev_salt_change_in_prod"
    SESSION_SECRET: str = "dev_session_secret_change_in_prod"
    APP_ORIGIN: str = "http://localhost:3000"


settings = Settings()
