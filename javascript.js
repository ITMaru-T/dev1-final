(function ($) {
    $(function () {

        // ─── Scroll-aware nav ────────────────────────────────────────────────
        // The nav starts transparent (great over the dark wood header).
        // Once the user scrolls past 80 px it transitions to a solid dark-warm
        // background so text stays readable over the white content sections.
        var $nav = $('.top-nav');
        var SCROLL_THRESHOLD = 80;

        function updateNavOnScroll() {
            if (window.scrollY > SCROLL_THRESHOLD) {
                $nav.addClass('is-scrolled');
            } else {
                $nav.removeClass('is-scrolled');
            }
        }

        $(window).on('scroll', updateNavOnScroll);
        updateNavOnScroll(); // run once immediately on page load

        // ─── Mobile hamburger toggle ─────────────────────────────────────────
        $nav.each(function () {
            var $n      = $(this);
            var $toggle = $n.find('.nav-toggle');
            var $links  = $n.find('.nav-links');

            if (!$toggle.length || !$links.length) return;

            var linksId = $links.attr('id');
            if (!linksId) {
                linksId = 'primary-navigation';
                $links.attr('id', linksId);
            }

            $toggle.attr({
                'aria-expanded': 'false',
                'aria-controls': linksId,
                'aria-label': 'Toggle navigation menu'
            });

            var closeMenu = function () {
                $n.removeClass('is-open');
                $toggle.attr('aria-expanded', 'false');
            };

            $toggle.on('click', function () {
                var isOpen = $n.toggleClass('is-open').hasClass('is-open');
                $toggle.attr('aria-expanded', String(isOpen));
            });

            $links.find('a').on('click', function () {
                if (window.matchMedia('(max-width: 767px)').matches) closeMenu();
            });

            $(document).on('keydown', function (e) {
                if (e.key === 'Escape') closeMenu();
            });

            $(window).on('resize', function () {
                if (window.innerWidth >= 768) closeMenu();
            });
        });

        // ─── Image carousel ──────────────────────────────────────────────────
        var $cards = $('.render-card');
        if ($cards.length) {
            var $prevButton    = $('#prev-slide');
            var $nextButton    = $('#next-slide');
            var $renderTrack   = $('#render-track');
            var activeIndex    = 0;
            var touchStartX    = 0;
            var touchStartY    = 0;
            var swipeThreshold = 50;

            function paintSlides() {
                var total = $cards.length;
                $cards.each(function (index) {
                    var $card  = $(this);
                    var offset = (index - activeIndex + total) % total;
                    $card.removeClass('is-active is-left is-right is-hidden');
                    if      (offset === 0)         $card.addClass('is-active');
                    else if (offset === 1)         $card.addClass('is-right');
                    else if (offset === total - 1) $card.addClass('is-left');
                    else                           $card.addClass('is-hidden');
                });
            }

            function showPrevious() {
                activeIndex = (activeIndex - 1 + $cards.length) % $cards.length;
                paintSlides();
            }

            function showNext() {
                activeIndex = (activeIndex + 1) % $cards.length;
                paintSlides();
            }

            $prevButton.on('click', showPrevious);
            $nextButton.on('click', showNext);

            $renderTrack.on('touchstart', function (e) {
                var t = e.originalEvent.changedTouches[0];
                touchStartX = t.clientX;
                touchStartY = t.clientY;
            });

            $renderTrack.on('touchend', function (e) {
                var t      = e.originalEvent.changedTouches[0];
                var deltaX = t.clientX - touchStartX;
                var deltaY = t.clientY - touchStartY;
                if (Math.abs(deltaX) < swipeThreshold || Math.abs(deltaX) <= Math.abs(deltaY)) return;
                if (deltaX < 0) showNext(); else showPrevious();
            });

            paintSlides();
        }

        // ─── Purchase page: save qty to localStorage ─────────────────────────
        var $productQty = $('#qty');
        var $addToCart  = $('.retail-buy-button[href*="../cart/index.html"]');
        if ($productQty.length && $addToCart.length) {
            $addToCart.on('click', function () {
                var qty = Math.max(parseInt($productQty.val(), 10) || 1, 1);
                try {
                    window.localStorage.setItem('cartQty', String(qty));
                    window.localStorage.setItem('cartHasItem', 'true');
                } catch (e) {}
            });
        }

        // ─── Cart page ────────────────────────────────────────────────────────
        var $cartQty = $('#cart-qty');
        if ($cartQty.length) {
            var $itemTotal      = $('#cart-item-total');
            var $subtotal       = $('#summary-subtotal');
            var $tax            = $('#summary-tax');
            var $total          = $('#summary-total');
            var $delivery       = $('#summary-delivery');
            var $itemsCount     = $('#cart-items-count');
            var $itemCard       = $('#cart-item-card');
            var $emptyState     = $('#empty-cart-state');
            var $removeItem     = $('#cart-remove-item');
            var $checkoutButton = $('.checkout-button');
            var cartHasItem     = false;

            try {
                cartHasItem = window.localStorage.getItem('cartHasItem') === 'true';
            } catch (e) {
                cartHasItem = false;
            }

            var parseCurrency = function (v) { return Number(String(v).replace(/[^0-9.-]/g, '')) || 0; };
            var formatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 });

            var unitPrice = parseCurrency($subtotal.text());
            var baseTax   = parseCurrency($tax.text());
            var taxRate   = unitPrice > 0 ? baseTax / unitPrice : 0;

            var params        = new URLSearchParams(window.location.search);
            var qtyFromQuery  = parseInt(params.get('qty'), 10);
            var qtyFromStorage;
            try { qtyFromStorage = parseInt(window.localStorage.getItem('cartQty'), 10); } catch (e) { qtyFromStorage = NaN; }

            var requestedQty = cartHasItem
                ? (Number.isFinite(qtyFromQuery) ? qtyFromQuery : (Number.isFinite(qtyFromStorage) ? qtyFromStorage : NaN))
                : NaN;

            if (Number.isFinite(requestedQty)) {
                var maxQty = Math.max.apply(null, $cartQty.find('option').map(function () { return parseInt($(this).val(), 10) || 1; }).get());
                $cartQty.val(String(Math.min(Math.max(requestedQty, 1), maxQty || 1)));
            }

            var updateCartTotals = function () {
                if (!cartHasItem) {
                    $itemTotal.text(formatter.format(0));
                    $subtotal.text(formatter.format(0));
                    $tax.text(formatter.format(0));
                    $total.text(formatter.format(0));
                    if ($delivery.length) {
                        $delivery.text(formatter.format(0));
                    }
                    $('#summary-shipping').text(formatter.format(0));
                    return;
                }
                var qty           = Math.max(parseInt($cartQty.val(), 10) || 1, 1);
                var subtotal      = Math.round(unitPrice * qty);
                var estimatedTax  = Math.round(subtotal * taxRate);
                var deliveryCost = 215 + (qty - 1) * 150;
                var shippingHandling = 55 + (qty - 1) * 40;
                var orderTotal    = subtotal + estimatedTax + deliveryCost + shippingHandling;
                var itemLabel     = qty === 1 ? 'Item' : 'Items';
                $itemTotal.text(formatter.format(subtotal));
                $subtotal.text(formatter.format(subtotal));
                $delivery.text(formatter.format(deliveryCost));
                $('#summary-shipping').text(formatter.format(shippingHandling));
                $tax.text(formatter.format(estimatedTax));
                $total.text(formatter.format(orderTotal));
                $itemsCount.text(itemLabel + ' (' + qty + ')');
            };

            var syncCartVisibility = function () {
                if (cartHasItem) {
                    $itemCard.removeAttr('hidden').show();
                    $emptyState.attr('hidden', true);
                    $checkoutButton.removeClass('is-disabled').removeAttr('aria-disabled').removeAttr('tabindex');
                } else {
                    $itemCard.attr('hidden', true).hide();
                    $emptyState.removeAttr('hidden');
                    $itemsCount.text('Items (0)');
                    $checkoutButton.addClass('is-disabled').attr('aria-disabled', 'true').attr('tabindex', '-1');
                }
            };

            $cartQty.on('change input', function () {
                updateCartTotals();
                try {
                    window.localStorage.setItem('cartQty', String(Math.max(parseInt($cartQty.val(), 10) || 1, 1)));
                } catch (e) {}
            });

            $removeItem.on('click', function (e) {
                e.preventDefault();
                cartHasItem = false;
                try {
                    window.localStorage.setItem('cartHasItem', 'false');
                    window.localStorage.removeItem('cartQty');
                } catch (e) {}
                syncCartVisibility();
                updateCartTotals();
            });

            $checkoutButton.on('click', function (e) {
                if ($(this).hasClass('is-disabled')) e.preventDefault();
            });

            syncCartVisibility();
            updateCartTotals();
        }

        /* ── Checkout pages (shared helpers) ────────────────────────────── */
        if ($('.checkout-page').length) {
            const checkoutUnitPrice = 899;
            const checkoutTaxRate   = 72 / 899;
            const checkoutFormatter = new Intl.NumberFormat('en-US', {
                style: 'currency', currency: 'USD',
                minimumFractionDigits: 0, maximumFractionDigits: 0
            });

            let checkoutQty = 1;
            try {
                const stored = parseInt(window.localStorage.getItem('cartQty'), 10);
                if (Number.isFinite(stored) && stored >= 1) { checkoutQty = stored; }
            } catch (e) {}

            let checkoutExpressDelivery = false;
            try {
                checkoutExpressDelivery = window.localStorage.getItem('checkoutDelivery') === 'express';
            } catch (e) {}

            function calcPrices() {
                const subtotal         = Math.round(checkoutUnitPrice * checkoutQty);
                const tax              = Math.round(subtotal * checkoutTaxRate);
                const standardDelivery = 215 + (checkoutQty - 1) * 150;
                const expressDelivery  = 259 + (checkoutQty - 1) * 150;
                const delivery         = checkoutExpressDelivery ? expressDelivery : standardDelivery;
                const shippingHandling = 55 + (checkoutQty - 1) * 40;
                const total            = subtotal + tax + delivery + shippingHandling;
                return { subtotal, tax, standardDelivery, expressDelivery, delivery, shippingHandling, total };
            }

            function updateSidebar(p) {
                $('#sidebar-item-qty').text('Qty: ' + checkoutQty);
                $('#sidebar-item-price').text(checkoutFormatter.format(p.subtotal));
                $('#sidebar-subtotal').text(checkoutFormatter.format(p.subtotal));
                $('#sidebar-delivery').text(checkoutFormatter.format(p.delivery));
                $('#sidebar-shipping').text(checkoutFormatter.format(p.shippingHandling));
                $('#sidebar-tax').text(checkoutFormatter.format(p.tax));
                $('#sidebar-total').text(checkoutFormatter.format(p.total));
            }

            function validateSection($section) {
                let valid = true;
                $section.find('input[required], select[required]').each(function () {
                    if (!$(this).val().trim()) {
                        $(this).addClass('invalid');
                        valid = false;
                    } else {
                        $(this).removeClass('invalid');
                    }
                });
                return valid;
            }

            $('input').on('input', function () {
                if ($(this).val().trim()) { $(this).removeClass('invalid'); }
            });

            // Generic helpers for saving/restoring form fields
            function saveFormToStorage(formId, storageKey) {
                const data = {};
                $('#' + formId).find('input, select, textarea').each(function () {
                    const $field = $(this);
                    const key = $field.attr('name') || $field.attr('id');
                    if (!key) return;

                    if ($field.is(':radio')) {
                        if ($field.is(':checked')) {
                            data[key] = $field.val();
                        }
                        return;
                    }

                    if ($field.is(':checkbox')) {
                        data[key] = $field.is(':checked');
                        return;
                    }

                    data[key] = $field.val();
                });
                try { window.localStorage.setItem(storageKey, JSON.stringify(data)); } catch (e) {}
            }

            function restoreFormFromStorage(formId, storageKey) {
                try {
                    const raw = window.localStorage.getItem(storageKey);
                    if (!raw) return;
                    const data = JSON.parse(raw);
                    $('#' + formId).find('input, select, textarea').each(function () {
                        const $field = $(this);
                        const key = $field.attr('name') || $field.attr('id');
                        if (!key || data[key] === undefined) return;

                        if ($field.is(':radio')) {
                            $field.prop('checked', $field.val() === data[key]);
                            return;
                        }

                        if ($field.is(':checkbox')) {
                            $field.prop('checked', !!data[key]);
                            return;
                        }

                        $field.val(data[key]);
                    });
                } catch (e) {}
            }

            function clearCheckoutData() {
                try {
                    window.localStorage.removeItem('checkoutShipping');
                    window.localStorage.removeItem('checkoutPayment');
                    window.localStorage.removeItem('checkoutDelivery');
                    window.localStorage.removeItem('cartQty');
                    window.localStorage.setItem('cartHasItem', 'false');
                } catch (e) {}
            }

            /* ── Step 1: Shipping ── */
            if ($('.checkout-shipping').length) {
                // Restore saved shipping fields
                restoreFormFromStorage('shipping-form', 'checkoutShipping');

                // Use radio state if restored from storage
                const restoredDelivery = $('input[name="delivery"]:checked').val();
                if (restoredDelivery) {
                    checkoutExpressDelivery = restoredDelivery === 'express';
                }

                function renderShippingPrices() {
                    const p = calcPrices();
                    $('#standard-delivery-price').text(checkoutFormatter.format(p.standardDelivery));
                    $('#express-delivery-price').text(checkoutFormatter.format(p.expressDelivery));
                    updateSidebar(p);
                }

                function applyDeliveryChoice(isExpress) {
                    checkoutExpressDelivery = isExpress;
                    $('.delivery-option').removeClass('selected');
                    const $selectedLabel = isExpress ? $('#delivery-express-label') : $('#delivery-standard-label');
                    $selectedLabel.addClass('selected');
                    $selectedLabel.find('input').prop('checked', true);
                    try { window.localStorage.setItem('checkoutDelivery', isExpress ? 'express' : 'standard'); } catch (e) {}
                    saveFormToStorage('shipping-form', 'checkoutShipping');
                    renderShippingPrices();
                }

                applyDeliveryChoice(checkoutExpressDelivery);

                // Auto-save shipping fields as user types
                $('#shipping-form').on('input change', function () {
                    saveFormToStorage('shipping-form', 'checkoutShipping');
                });

                $('.delivery-option').on('click', function () {
                    applyDeliveryChoice($(this).find('input').val() === 'express');
                });

                $('input[name="delivery"]').on('change', function () {
                    applyDeliveryChoice($(this).val() === 'express');
                });

                $('#to-payment-btn').on('click', function () {
                    if (!validateSection($('#section-shipping'))) return;
                    saveFormToStorage('shipping-form', 'checkoutShipping');
                    window.location.href = 'payment.html';
                });
            }

            /* ── Step 2: Payment ── */
            if ($('.checkout-payment').length) {
                updateSidebar(calcPrices());

                // Restore saved payment fields
                restoreFormFromStorage('payment-form', 'checkoutPayment');

                // Card number formatting
                $('#card-number').on('input', function () {
                    let val = $(this).val().replace(/\D/g, '').substring(0, 16);
                    val = val.replace(/(.{4})/g, '$1 ').trim();
                    $(this).val(val);
                });

                // Expiry formatting
                $('#card-expiry').on('input', function () {
                    const raw = $(this).val().replace(/\D/g, '').substring(0, 4);
                    if (!raw.length) {
                        $(this).val('');
                        return;
                    }

                    let month;
                    if (raw.length === 1) {
                        month = raw[0] === '0' || raw[0] === '1' ? raw[0] : ('0' + raw[0]);
                    } else {
                        let monthNum = parseInt(raw.substring(0, 2), 10);
                        if (!Number.isFinite(monthNum) || monthNum < 1) monthNum = 1;
                        if (monthNum > 12) monthNum = 12;
                        month = String(monthNum).padStart(2, '0');
                    }

                    const year = raw.length > 2 ? raw.substring(2) : '';
                    $(this).val(year ? (month + ' / ' + year) : month);
                });

                // Auto-save payment fields as user types
                $('#payment-form').on('input change', function () {
                    saveFormToStorage('payment-form', 'checkoutPayment');
                });

                $('#to-review-btn').on('click', function () {
                    if (!validateSection($('#section-payment'))) return;
                    saveFormToStorage('payment-form', 'checkoutPayment');
                    window.location.href = 'review.html';
                });
            }

            /* ── Step 3: Review ── */
            if ($('.checkout-review').length) {
                const p = calcPrices();
                updateSidebar(p);

                function showOrderConfetti() {
                    const $modalOverlay = $('#order-modal');
                    if (!$modalOverlay.length) return;

                    $modalOverlay.find('.order-confetti').remove();

                    const $confettiLayer = $('<div class="order-confetti" aria-hidden="true"></div>');
                    const colors = ['#f4b400', '#34a853', '#4285f4', '#ea4335', '#7a9a6a', '#5c4438'];
                    const totalPieces = 110;

                    for (let i = 0; i < totalPieces; i += 1) {
                        const piece = document.createElement('span');
                        const size = 6 + Math.random() * 8;
                        const isRound = Math.random() < 0.35;
                        const angle = Math.random() * Math.PI * 2;
                        const distance = 120 + Math.random() * 520;
                        const burstX = Math.cos(angle) * distance;
                        const burstY = Math.sin(angle) * distance;

                        piece.className = 'order-confetti-piece';
                        piece.style.setProperty('--burst-x', burstX.toFixed(1) + 'px');
                        piece.style.setProperty('--burst-y', burstY.toFixed(1) + 'px');
                        piece.style.setProperty('--burst-delay', (Math.random() * 0.18).toFixed(2) + 's');
                        piece.style.setProperty('--burst-duration', (1.3 + Math.random() * 1.1).toFixed(2) + 's');
                        piece.style.setProperty('--spin', (180 + Math.random() * 900).toFixed(0) + 'deg');
                        piece.style.setProperty('--confetti-color', colors[Math.floor(Math.random() * colors.length)]);
                        piece.style.width = size.toFixed(1) + 'px';
                        piece.style.height = (isRound ? size : size * 1.45).toFixed(1) + 'px';
                        piece.style.borderRadius = isRound ? '999px' : '2px';

                        $confettiLayer.append(piece);
                    }

                    $modalOverlay.append($confettiLayer);
                    window.setTimeout(function () {
                        $confettiLayer.remove();
                    }, 2800);
                }

                $('#review-item-qty').text('Solid oak veneer + powder-coated steel · Qty ' + checkoutQty);
                $('#review-item-price').text(checkoutFormatter.format(p.subtotal));
                $('#review-subtotal').text(checkoutFormatter.format(p.subtotal));
                $('#review-delivery').text(checkoutFormatter.format(p.delivery));
                $('#review-shipping').text(checkoutFormatter.format(p.shippingHandling));
                $('#review-tax').text(checkoutFormatter.format(p.tax));
                $('#review-total').text(checkoutFormatter.format(p.total));

                $('#place-order-btn').on('click', function () {
                    clearCheckoutData();
                    $('#order-modal').removeAttr('hidden');
                    showOrderConfetti();
                });
            }
        }
    });
})(jQuery);
