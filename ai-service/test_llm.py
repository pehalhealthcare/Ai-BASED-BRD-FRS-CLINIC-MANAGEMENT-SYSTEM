import asyncio
from app.core.config import get_settings
from app.adapters.llm_adapter import LLMAdapter

async def test_llm():
    settings = get_settings()
    try:
        print("API KEY:", settings.llm_api_key)
        adapter = LLMAdapter(
            provider=settings.llm_provider,
            api_key=settings.llm_api_key,
            model_name="openrouter/free",
            timeout_seconds=30,
            enable_llm=True
        )
        
        system_prompt = "You are a helpful AI assistant. Always return JSON."
        user_prompt = '{"task": "symptom_check", "payload": {"symptoms": "white patches in finger tips"}}'
        
        print("Sending request...")
        res = adapter.generate_medical_response(system_prompt, user_prompt)
        print("Response:", res)
    except Exception as e:
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_llm())
