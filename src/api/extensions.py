from authlib.integrations.flask_client import OAuth
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

oauth = OAuth()

# Debug print to check environment variables
print("GitHub OAuth Config:")
print(f"Client ID: {os.getenv('GITHUB_CLIENT_ID')}")
print(f"Redirect URI: {os.getenv('BACKEND_URL')}/api/authorize/github") 