import sys
import time
from Foundation import NSObject
from LocalAuthentication import (
    LAContext,
    kLAPolicyDeviceOwnerAuthenticationWithBiometrics,
)


class AuthDelegate(NSObject):
    def __init__(self):
        self.success = None


def authenticate():
    context = LAContext()

    # Check if biometrics are available
    can_eval, error = context.canEvaluatePolicy_error_(
        kLAPolicyDeviceOwnerAuthenticationWithBiometrics, None
    )

    if not can_eval:
        print("BIOMETRICS_UNAVAILABLE", file=sys.stderr)
        sys.exit(1)

    # Create a flag to track completion
    completed = [False]
    result = [False]

    def completion_handler(success, error):
        result[0] = success
        completed[0] = True

    # Trigger Touch ID prompt
    context.evaluatePolicy_localizedReason_reply_(
        kLAPolicyDeviceOwnerAuthenticationWithBiometrics,
        "Unlock Lockbox",
        completion_handler,
    )

    # Wait for authentication to complete
    while not completed[0]:
        time.sleep(0.1)

    if result[0]:
        print("SUCCESS")
        sys.exit(0)
    else:
        print("FAILED", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    authenticate()
