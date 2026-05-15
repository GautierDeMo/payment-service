document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('payment-form');

    const cardNumberInput = document.getElementById('card-number');
    const cardNameInput = document.getElementById('card-name');
    const cardExpiryInput = document.getElementById('card-expiry');
    const cardCvvInput = document.getElementById('card-cvv');

    const payButton = document.getElementById('pay-btn');
    const cancelButton = document.getElementById('cancel-btn');
    const paymentMessage = document.getElementById('payment-message');

    const orderId = sessionStorage.getItem('orderId');
    const cart = JSON.parse(sessionStorage.getItem('cart') || '[]');
    const total = parseFloat(sessionStorage.getItem('total') || '0');
    const token = localStorage.getItem('jwt') || localStorage.getItem('bibliotheca_token');

    // Extract user info from JWT token
    let userId, firstName, lastName;
    if (token) {
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            userId = payload.sub ?? payload.userId;
            // le service d'authentification ne stocke pas le prénom et le nom séparément, mais un champ "name" avec les deux.
            // On va faire du bricolage pour les séparer, en prenant le premier mot comme prénom et le reste comme nom de famille.
            // c'est bancal, mais pas le choix sans modifier le service d'authentification... sorry.
            const nameParts = (payload.name ?? '').trim().split(/\s+/);
            firstName = nameParts[0] ?? '';
            lastName = nameParts.slice(1).join(' ') || '';
        } catch (e) {
            console.error('Invalid token', e);
        }
    } else {
        console.error('No token found in localStorage');
        showMessage('❌ Non authentifié - Veuillez vous connecter', 'error');
        // form.style.display = 'none';
        return;
    }

    const catalogUrl = sessionStorage.getItem('catalogUrl') || '';
    const frontUrl = sessionStorage.getItem('frontUrl') || '';
    const paymentsUrl = window.location.origin;

    const PAYMENT_TIMEOUT = 2 * 60 * 1000;
    const startTime = Date.now();

    let isSubmitting = false;

    /*
    =========================================
    SECURITY HELPERS
    =========================================
    */

    function sanitizeInput(value) {
        return value.replace(/[<>{}()[\];"\\]/g, '').trim();
    }

    function sanitizeName(value) {
        return value
            .replace(/[^A-ZÀ-ÿ\s'-]/gi, '')
            .replace(/\s{2,}/g, ' ')
            .trimStart()
            .toUpperCase();
    }

    function isExpired() {
        return Date.now() - startTime > PAYMENT_TIMEOUT;
    }

    /**
     * Notify the catalog service of a stock outcome for every item in cart.
     * @param {'PAYMENT_SUCCESS'|'PAYMENT_FAILED'|'CART_ABANDONED'} status
     */
    async function notifyStockEvents(status) {
        if (!catalogUrl) return;
        const tasks = cart.map((item) => {
            const bookId = item.bookId || item.id;
            const idempotencyKey = `${orderId}-${bookId}-${status.toLowerCase()}`;
            return fetch(`${catalogUrl}/api/books/${bookId}/stock-events`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                    'x-idempotency-key': idempotencyKey
                },
                body: JSON.stringify({ status, quantity: item.quantity })
            }).catch(() => {}); // fire-and-forget per book
        });
        await Promise.allSettled(tasks);
    }

    // Start the 2-minute expiry watchdog
    const expiryTimer = setTimeout(async () => {
        if (!isSubmitting) {
            showMessage('⏱ Délai de paiement expiré, commande annulée.', 'error');
            form.style.display = 'none';
            await notifyStockEvents('CART_ABANDONED');
            sessionStorage.setItem('orderResult', JSON.stringify({ orderId, cart, total, status: 'FAILED' }));
            setTimeout(() => {
                window.location.href = frontUrl ? `${frontUrl}/commande` : '/commande';
            }, 2000);
        }
    }, PAYMENT_TIMEOUT);


    
    /*
    =========================================
    Luhn Algorithm
    =========================================
    */

    function luhnCheck(number) {
        let sum = 0;
        let shouldDouble = false;

        for (let i = number.length - 1; i >= 0; i--) {
            let digit = parseInt(number[i]);

            if (shouldDouble) {
                digit *= 2;
                if (digit > 9) digit -= 9;
            }

            sum += digit;
            shouldDouble = !shouldDouble;
        }

        return sum % 10 === 0;
    }

    /*
    =========================================
    CARD DETECTION
    =========================================
    */

    function getCardType(number) {
        if (/^4/.test(number)) return 'visa';
        if (/^5[1-5]/.test(number)) return 'mastercard';
        return null;
    }

    function isCardAllowed(type) {
        return type === 'visa' || type === 'mastercard';
    }

    /*
    =========================================
    VALIDATION
    =========================================
    */

    function validateCardNumber(number) {
        const clean = number.replace(/\s/g, '');

        if (!/^\d{13,19}$/.test(clean)) {
            return {isValid: false, type: null};
        }

        const type = getCardType(clean);

        if (!type || !isCardAllowed(type)) {
            return {isValid: false, type: null};
        }

        return {
            isValid: luhnCheck(clean),
            type
        };
    }

    function validateName(name) {
        const cleaned = name.trim().toUpperCase();
        // doit contenir au moins 2 mots (prenom + nom)
        const parts = cleaned.split(/\s+/);

        if (parts.length < 2) return false;
        return parts.every(part => /^[A-ZÀ-ÿ'-]{2,}$/.test(part));
    }

    function validateExpiry(value) {
        const match = value.match(/^(\d{2})\/(\d{2})$/);
        if (!match) return false;

        const month = parseInt(match[1], 10);
        const year = parseInt(match[2], 10);

        // mois impossible
        if (month < 1 || month > 12) return false;

        const now = new Date();
        const currentYear = now.getFullYear() % 100;
        const currentMonth = now.getMonth() + 1;

        // date dans le passé
        return !(year < currentYear || (year === currentYear && month < currentMonth));
    }

    function validateCvv(cvv) {
        return /^\d{3}$/.test(cvv);
    }

    /*
    =========================================
    UI HELPERS
    =========================================
    */

    function showMessage(msg, type) {
        paymentMessage.textContent = msg;
        paymentMessage.className = `payment-message ${type}`;
        paymentMessage.style.display = 'block';
    }

    function showError(input, el, msg) {
        input.classList.add('error');
        input.classList.remove('valid');
        el.textContent = msg;
        el.classList.add('show');
    }

    function hideError(input, el) {
        input.classList.remove('error');
        input.classList.add('valid');
        el.classList.remove('show');
    }

    function showCardType(type) {
        const el = document.getElementById('card-type');

        if (!type) {
            el.classList.remove('show');
            return;
        }

        el.textContent = `🟢 ${type.toUpperCase()} détecté`;
        el.classList.add('show');
    }

    /*
    =========================================
    INPUT EVENTS
    =========================================
    */

    cardNumberInput.addEventListener('input', function () {
        let value = this.value.replace(/\D/g, '').substring(0, 16);
        this.value = value.match(/.{1,4}/g)?.join(' ') || value;

        const error = document.getElementById('card-number-error');
        const result = validateCardNumber(value);

        if (!value) {
            showError(this, error, 'Numéro requis');
            showCardType(null);
            return;
        }

        if (!result.type) {
            showError(this, error, 'Visa ou Mastercard uniquement');
            showCardType(null);
            return;
        }

        if (!result.isValid) {
            showError(this, error, 'Numéro invalide');
            showCardType(null);
            return;
        }

        hideError(this, error);
        showCardType(result.type);
    });

    cardNameInput.addEventListener('input', function () {
        this.value = sanitizeName(this.value);

        const error = document.getElementById('card-name-error');

        if (!this.value) {
            showError(this, error, 'Nom requis');
        } else if (!validateName(this.value)) {
            showError(this, error, 'Nom invalide');
        } else {
            hideError(this, error);
        }
    });

    cardExpiryInput.addEventListener('input', function () {
        let value = this.value.replace(/\D/g, '').substring(0, 4);

        if (value.length >= 2) {
            value = value.slice(0, 2) + '/' + value.slice(2);
        }

        this.value = value;

        const error = document.getElementById('card-expiry-error');

        if (!value) {
            showError(this, error, 'Expiration requise');
            return;
        }

        if (!validateExpiry(value)) {
            showError(this, error, 'Date invalide');
            return;
        }

        hideError(this, error);
    });

    cardCvvInput.addEventListener('input', function () {
        this.value = this.value.replace(/\D/g, '').substring(0, 3);

        const error = document.getElementById('card-cvv-error');

        if (!this.value) {
            showError(this, error, 'CVV requis');
        } else if (!validateCvv(this.value)) {
            showError(this, error, 'CVV invalide');
        } else {
            hideError(this, error);
        }
    });

    /*
    =========================================
    FORM VALIDATION
    =========================================
    */

    function validateForm() {
        return (
            validateCardNumber(cardNumberInput.value.replace(/\s/g, '')).isValid &&
            validateName(cardNameInput.value) &&
            validateExpiry(cardExpiryInput.value) &&
            validateCvv(cardCvvInput.value)
        );
    }

    /*
    =========================================
    SUBMIT
    =========================================
    */

    form.addEventListener('submit', async function (e) {
        e.preventDefault();

        if (isSubmitting) return;

        if (isExpired()) {
            showMessage('❌ Paiement refusé : délai dépassé', 'error');
            return;
        }

        if (!validateForm()) {
            showMessage("Le formulaire n'est pas valide", 'error');
            return;
        }

        isSubmitting = true;
        payButton.disabled = true;
        payButton.textContent = 'Traitement...';

        try {
            // Parse expiry from MM/AA to MM/YYYY
            const expiryParts = cardExpiryInput.value.split('/');
            const expiryMonth = expiryParts[0];
            const expiryYear = '20' + expiryParts[1]; // Convert AA to YYYY

            const response = await fetch('/api/payments', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    orderId,
                    cart,
                    total,
                    card: {
                        number: cardNumberInput.value.replace(/\s/g, ''),
                        expiryMonth,
                        expiryYear,
                        cvv: cardCvvInput.value,
                        holderName: sanitizeInput(cardNameInput.value)
                    }
                })
            });

            const result = await response.json();

            const finalStatus =
                response.ok && result.status === 'SUCCESS' && !isExpired()
                    ? 'SUCCESS'
                    : 'FAILED';

            showMessage(
                finalStatus === 'SUCCESS'
                    ? '✅ Paiement accepté'
                    : '❌ Paiement refusé',
                finalStatus === 'SUCCESS' ? 'success' : 'error'
            );

            // On success the stock was already decremented at reservation (CartPage).
            // Only send a rollback event on failure so catalog can re-increment.
            clearTimeout(expiryTimer);
            if (finalStatus !== 'SUCCESS') {
                await notifyStockEvents('PAYMENT_FAILED');
            }

            if (finalStatus === 'SUCCESS') {
                form.style.display = 'none';
                const invoiceId = result.invoiceId ?? null;
                sessionStorage.setItem('orderResult', JSON.stringify({
                    orderId,
                    cart,
                    total,
                    status: finalStatus,
                    invoiceId,
                    invoiceUrl: invoiceId ? `${paymentsUrl}/invoices/${invoiceId}/pdf` : null,
                }));
                setTimeout(() => {
                    window.location.href = frontUrl ? `${frontUrl}/commande` : '/commande';
                }, 1500);
            } else {
                isSubmitting = false;
                payButton.disabled = false;
                payButton.textContent = 'Payer';
            }
        } catch {
            showMessage('Erreur technique', 'error');
            isSubmitting = false;
            payButton.disabled = false;
            payButton.textContent = 'Payer';
        }
    });

    /*
    =========================================
    CANCEL BUTTON
    =========================================
    */

    cancelButton.addEventListener('click', async function () {
        cancelButton.disabled = true;
        cancelButton.textContent = 'Annulation...';
        clearTimeout(expiryTimer);
        await notifyStockEvents('CART_ABANDONED');
        sessionStorage.setItem('orderResult', JSON.stringify({
            orderId,
            cart,
            total,
            status: 'FAILED',
        }));
        window.location.href = frontUrl ? `${frontUrl}/commande` : '/commande';
    });
});
