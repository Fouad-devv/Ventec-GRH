from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    openai_api_key: str = ""
    anthropic_api_key: str = ""
    backend_url: str
    model_name: str = "gpt-4o-mini"
    claude_model: str = "claude-haiku-4-5-20251001"

    class Config:
        env_file = "../.env"
        extra = "ignore"


settings = Settings()
