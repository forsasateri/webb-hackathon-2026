"""Uvicorn entry point"""
import uvicorn


def main():
    uvicorn.run(
        "server.src.I1_entry.app:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
    )


if __name__ == "__main__":
    main()
