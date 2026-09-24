import re
import logging
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.models.db.entities import NewsletterSubscriber, AuditLog

logger = logging.getLogger("crisp_newsletter")
router = APIRouter()

EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")


class SubscribeRequest(BaseModel):
    email: str


class SubscribeResponse(BaseModel):
    success: bool
    message: str
    email: str
    already_subscribed: bool = False


@router.post("/subscribe", response_model=SubscribeResponse)
def subscribe_newsletter(payload: SubscribeRequest, db: Session = Depends(get_db)):
    email_clean = payload.email.strip().lower()

    if not email_clean or not EMAIL_REGEX.match(email_clean):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Please provide a valid email address."
        )

    # Check for existing subscriber
    existing = db.query(NewsletterSubscriber).filter(NewsletterSubscriber.email == email_clean).first()
    if existing:
        if not existing.is_active:
            existing.is_active = True
            existing.subscribed_at = datetime.utcnow()
            db.commit()
            return SubscribeResponse(
                success=True,
                message="Welcome back! Your subscription to CRISP AI updates has been reactivated.",
                email=email_clean,
                already_subscribed=False
            )
        return SubscribeResponse(
            success=True,
            message="You are already subscribed to CRISP AI research and product updates!",
            email=email_clean,
            already_subscribed=True
        )

    # Create new subscriber
    new_sub = NewsletterSubscriber(
        email=email_clean,
        subscribed_at=datetime.utcnow(),
        is_active=True
    )
    db.add(new_sub)

    # Log to audit trail
    audit = AuditLog(
        workspace_id=1,
        action="NEWSLETTER_SUBSCRIBE",
        resource="newsletter",
        resource_id=email_clean,
        status="SUCCESS",
        details=f"Subscribed {email_clean} to Causal AI research updates."
    )
    db.add(audit)
    db.commit()

    logger.info(f"Successfully subscribed {email_clean} to newsletter.")
    return SubscribeResponse(
        success=True,
        message="Thank you! You are now subscribed to the latest Causal AI research and product releases.",
        email=email_clean,
        already_subscribed=False
    )
