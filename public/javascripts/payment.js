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
    const token = localStorage.getItem('jwt');

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
            const response = await fetch('/checkout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    orderId,
                    status: 'PENDING',
                    cart,
                    total,
                    paymentMethod: {
                        cardNumber: cardNumberInput.value.replace(/\s/g, ''),
                        cardName: sanitizeInput(cardNameInput.value),
                        cardExpiry: cardExpiryInput.value,
                        cardCvv: cardCvvInput.value
                    }
                })
            });

            const result = await response.json();

            const finalStatus =
                response.ok && result.status === 'SUCCESS' && !isExpired()
                    ? 'SUCCESS'
                    : 'FAILED';

            await fetch('/api/orders/confirm', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({orderId, status: finalStatus})
            });

            showMessage(
                finalStatus === 'SUCCESS'
                    ? '✅ Paiement accepté'
                    : '❌ Paiement refusé',
                finalStatus === 'SUCCESS' ? 'success' : 'error'
            );

            if (finalStatus === 'SUCCESS') form.style.display = 'none';
            else {
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

    cancelButton.addEventListener('click', function () {
        window.history.back();
    });
});
