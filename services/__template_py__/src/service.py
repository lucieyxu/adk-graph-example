from fastapi import APIRouter
from fastapi.responses import JSONResponse
from pydantic import TypeAdapter
from shared.types.general import ApiError
from shared.types.services.py_example import HelloInput, HelloOutput

HelloInputAdapter = TypeAdapter(HelloInput)
HelloOutputAdapter = TypeAdapter(HelloOutput)

api_group = APIRouter()


@api_group.get("/health")
def route_health():
    return JSONResponse({"error": False})


#
# Implement your service endpoints here!
#


@api_group.post(
    "/hello",
    response_model=HelloOutput,
    responses={
        500: {"model": ApiError},
        422: {"description": "Validation Error"},
    },
)
def route_hello(data: HelloInput):
    try:
        response = HelloOutput(hello=data.name)
        return response

    except Exception as e:
        api_error = ApiError(
            error=True,
            input=data.model_dump(),
            message=f"Error generating text: {str(e)}",
        )
        return JSONResponse(api_error.model_dump_json())
