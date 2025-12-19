from .models import Account, Plan


class LimitError(Exception):
    """Raised when a user hits their plan limit."""
    pass


def check_and_increment_leads(user) -> Account:
    account = user.account
    plan = account.plan

    max_leads = plan.max_leads
    used = account.leads_used

    if account.hard_block:
        raise LimitError("Your account is blocked. Please contact support.")

    if account.trial_over:
        raise LimitError("Your trial has ended. Please buy a plan to continue saving leads.")

    if max_leads is not None and used >= max_leads:
        raise LimitError("Your trial lead limit is reached. Please buy a plan to continue.")

    account.leads_used = used + 1
    account.save(update_fields=["leads_used"])
    return account


def check_and_increment_comments(user) -> Account:
    """
    Same idea as leads, but for comment generation saves.
    """
    account = user.account
    plan = account.plan

    max_comments = plan.max_comments
    used = account.comments_used

    if account.hard_block:
        raise LimitError("Your account is blocked. Please contact support.")

    if account.trial_over:
        raise LimitError("Your trial has ended. Please buy a plan to continue generating comments.")

    if max_comments is not None and used >= max_comments:
        raise LimitError("Your trial comment limit is reached. Please buy a plan to continue.")

    account.comments_used = used + 1
    account.save(update_fields=["comments_used"])
    return account


def check_comments_quota(user) -> Account:
    """
    Read‑only version for comment quota.
    Does NOT increment, just raises LimitError if not allowed.
    """
    account = user.account
    plan = account.plan

    max_comments = plan.max_comments
    used = account.comments_used

    if account.hard_block:
        raise LimitError("Your account is blocked. Please contact support.")

    if account.trial_over:
        raise LimitError("Your trial has ended. Please buy a plan to continue generating comments.")

    if max_comments is not None and used >= max_comments:
        raise LimitError("Your trial comment limit is reached. Please buy a plan to continue.")

    # Allowed; no mutation
    return account
