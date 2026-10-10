import { reactive } from 'vue';

interface ConfirmRequest {
    open: boolean;
    message: string;
    confirmLabel: string | null;
    destructive: boolean;
    resolve: ((confirmed: boolean) => void) | null;
}

/** The one pending question, shown by ConfirmDialog in the app layout. */
export const confirmState = reactive<ConfirmRequest>({
    open: false,
    message: '',
    confirmLabel: null,
    destructive: true,
    resolve: null,
});

/**
 * Asks the player to confirm in a modal, like window.confirm but styled
 * and translated: resolves true for Confirm, false for Cancel or dismiss.
 */
export function confirmAction(
    message: string,
    options: { confirmLabel?: string; destructive?: boolean } = {},
): Promise<boolean> {
    // A newer question replaces an unanswered one.
    confirmState.resolve?.(false);

    return new Promise((resolve) => {
        Object.assign(confirmState, {
            open: true,
            message,
            confirmLabel: options.confirmLabel ?? null,
            destructive: options.destructive ?? true,
            resolve,
        });
    });
}

export function answerConfirm(confirmed: boolean): void {
    const resolve = confirmState.resolve;
    confirmState.open = false;
    confirmState.resolve = null;
    resolve?.(confirmed);
}
