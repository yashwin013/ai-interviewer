from motor.motor_asyncio import AsyncIOMotorClient
from app.config import settings

# MongoDB connection with SSL configuration for Python 3.13 compatibility
# Note: The main issue is IP whitelisting in MongoDB Atlas Network Access
# Once your IP is whitelisted, this connection will work properly
client = AsyncIOMotorClient(
    settings.MONGO_URI,
    tlsAllowInvalidCertificates=True,
    serverSelectionTimeoutMS=5000,
)
db = client[settings.DB_NAME]

