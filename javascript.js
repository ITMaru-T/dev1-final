(function ($) {
    $(function () {
        $('.top-nav').each(function () {
            const $nav = $(this);
            const $toggle = $nav.find('.nav-toggle');
            const $links = $nav.find('.nav-links');

            if (!$toggle.length || !$links.length) {
                return;
            }

            const closeMenu = () => {
                $nav.removeClass('is-open');
            };

            $toggle.on('click', function () {
                $nav.toggleClass('is-open');
            });

            $links.find('a').on('click', function () {
                if (window.matchMedia('(max-width: 767px)').matches) {
                    closeMenu();
                }
            });

            $(window).on('resize', function () {
                if (window.innerWidth >= 768) {
                    closeMenu();
                }
            });
        });

        const $cards = $('.render-card');
        if ($cards.length) {
            const $prevButton = $('#prev-slide');
            const $nextButton = $('#next-slide');
            const $renderTrack = $('#render-track');
            let activeIndex = 0;
            let touchStartX = 0;
            let touchStartY = 0;
            const swipeThreshold = 50;

            function paintSlides() {
                const total = $cards.length;

                $cards.each(function (index) {
                    const $card = $(this);
                    $card.removeClass('is-active is-left is-right is-hidden');

                    const offset = (index - activeIndex + total) % total;

                    if (offset === 0) {
                        $card.addClass('is-active');
                    } else if (offset === 1) {
                        $card.addClass('is-right');
                    } else if (offset === total - 1) {
                        $card.addClass('is-left');
                    } else {
                        $card.addClass('is-hidden');
                    }
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

            $renderTrack.on('touchstart', function (event) {
                const touch = event.originalEvent.changedTouches[0];
                touchStartX = touch.clientX;
                touchStartY = touch.clientY;
            });

            $renderTrack.on('touchend', function (event) {
                const touch = event.originalEvent.changedTouches[0];
                const deltaX = touch.clientX - touchStartX;
                const deltaY = touch.clientY - touchStartY;

                if (Math.abs(deltaX) < swipeThreshold || Math.abs(deltaX) <= Math.abs(deltaY)) {
                    return;
                }

                if (deltaX < 0) {
                    showNext();
                } else {
                    showPrevious();
                }
            });

            paintSlides();
        }

        const $productQty = $('#qty');
        const $addToCart = $('.retail-buy-button[href*="../cart/index.html"]');
        if ($productQty.length && $addToCart.length) {
            $addToCart.on('click', function () {
                const qty = Math.max(parseInt($productQty.val(), 10) || 1, 1);

                try {
                    window.localStorage.setItem('cartQty', String(qty));
                } catch (error) {
                    // Ignore storage errors in restrictive browsing contexts.
                }
            });
        }

        const $cartQty = $('#cart-qty');
        if ($cartQty.length) {
            const $itemTotal = $('#cart-item-total');
            const $subtotal = $('#summary-subtotal');
            const $tax = $('#summary-tax');
            const $total = $('#summary-total');
            const $delivery = $('#summary-delivery');
            const $itemsCount = $('#cart-items-count');
            const $itemCard = $('#cart-item-card');
            const $emptyState = $('#empty-cart-state');
            const $removeItem = $('#cart-remove-item');
            const $checkoutButton = $('.checkout-button');
            let cartHasItem = true;

            const parseCurrency = (value) => Number(String(value).replace(/[^0-9.-]/g, '')) || 0;
            const formatter = new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
            });

            // Read unit price and tax rate BEFORE applying any stored qty so
            // the HTML always reflects qty=1 at this point.
            const unitPrice = parseCurrency($subtotal.text());
            const baseTax   = parseCurrency($tax.text());
            const taxRate   = unitPrice > 0 ? baseTax / unitPrice : 0;

            const params = new URLSearchParams(window.location.search);
            const qtyFromQuery = parseInt(params.get('qty'), 10);
            let qtyFromStorage;

            try {
                qtyFromStorage = parseInt(window.localStorage.getItem('cartQty'), 10);
            } catch (error) {
                qtyFromStorage = NaN;
            }

            const requestedQty = Number.isFinite(qtyFromQuery)
                ? qtyFromQuery
                : (Number.isFinite(qtyFromStorage) ? qtyFromStorage : NaN);

            if (Number.isFinite(requestedQty)) {
                const maxQty = Math.max(...$cartQty.find('option').map(function () {
                    return parseInt($(this).val(), 10) || 1;
                }).get());

                const normalizedQty = Math.min(Math.max(requestedQty, 1), maxQty || 1);
                $cartQty.val(String(normalizedQty));
            }

            const updateCartTotals = () => {
                if (!cartHasItem) {
                    return;
                }

                const qty = Math.max(parseInt($cartQty.val(), 10) || 1, 1);
                const subtotal = Math.round(unitPrice * qty);
                const estimatedTax = Math.round(subtotal * taxRate);
                const deliveryCost = 215 + (qty - 1) * 150;
                const shippingHandling = 55 + (qty - 1) * 40;
                const orderTotal = subtotal + estimatedTax + deliveryCost + shippingHandling;
                const itemLabel = qty === 1 ? 'Item' : 'Items';

                $itemTotal.text(formatter.format(subtotal));
                $subtotal.text(formatter.format(subtotal));
                $delivery.text(formatter.format(deliveryCost));
                $('#summary-shipping').text(formatter.format(shippingHandling));
                $tax.text(formatter.format(estimatedTax));
                $total.text(formatter.format(orderTotal));
                $itemsCount.text(itemLabel + ' (' + qty + ')');
            };

            $cartQty.on('change input', function () {
                updateCartTotals();
                try {
                    window.localStorage.setItem('cartQty', String(Math.max(parseInt($cartQty.val(), 10) || 1, 1)));
                } catch (e) {}
            });

            $removeItem.on('click', function (event) {
                event.preventDefault();

                cartHasItem = false;
                $itemCard.attr('hidden', true);
                $itemCard.hide();
                $emptyState.removeAttr('hidden');
                $itemsCount.text('Items (0)');
                $itemTotal.text(formatter.format(0));
                $subtotal.text(formatter.format(0));
                $tax.text(formatter.format(0));
                $total.text(formatter.format(0));

                if ($delivery.length) {
                    $delivery.text(formatter.format(0));
                }
                $('#summary-shipping').text(formatter.format(0));

                if ($checkoutButton.length) {
                    $checkoutButton.addClass('is-disabled');
                    $checkoutButton.attr('aria-disabled', 'true');
                    $checkoutButton.attr('tabindex', '-1');
                }
            });

            $checkoutButton.on('click', function (event) {
                if ($(this).hasClass('is-disabled')) {
                    event.preventDefault();
                }
            });

            updateCartTotals();
        }

        /* ── Checkout page ────────────────────────────── */
        if ($('.checkout-page').length) {
            const $steps        = $('.step');
            const $sectionShip  = $('#section-shipping');
            const $sectionPay   = $('#section-payment');
            const $sectionRev   = $('#section-review');
            const $toPaymentBtn = $('#to-payment-btn');
            const $toReviewBtn  = $('#to-review-btn');
            const $placeOrder   = $('#place-order-btn');
            const $modal        = $('#order-modal');

            // Apply saved cart quantity to checkout page
            const checkoutUnitPrice = 899;
            const checkoutTaxRate   = 72 / 899;
            const checkoutFormatter = new Intl.NumberFormat('en-US', {
                style: 'currency', currency: 'USD',
                minimumFractionDigits: 0, maximumFractionDigits: 0
            });
            let checkoutExpressDelivery = false;

            let checkoutQty = 1;
            try {
                const stored = parseInt(window.localStorage.getItem('cartQty'), 10);
                if (Number.isFinite(stored) && stored >= 1) { checkoutQty = stored; }
            } catch (e) {}

            function updateCheckoutPrices() {
                const subtotal         = Math.round(checkoutUnitPrice * checkoutQty);
                const tax              = Math.round(subtotal * checkoutTaxRate);
                const standardDelivery = 215 + (checkoutQty - 1) * 150;
                const expressDelivery  = 259 + (checkoutQty - 1) * 150;
                const delivery         = checkoutExpressDelivery ? expressDelivery : standardDelivery;
                const shippingHandling = 55 + (checkoutQty - 1) * 40;
                const total            = subtotal + tax + delivery + shippingHandling;
                const deliveryText     = checkoutFormatter.format(delivery);

                $('#standard-delivery-price').text(checkoutFormatter.format(standardDelivery));
                $('#express-delivery-price').text(checkoutFormatter.format(expressDelivery));

                $('#sidebar-item-qty').text('Qty: ' + checkoutQty);
                $('#sidebar-item-price').text(checkoutFormatter.format(subtotal));
                $('#sidebar-subtotal').text(checkoutFormatter.format(subtotal));
                $('#sidebar-delivery').text(deliveryText);
                $('#sidebar-shipping').text(checkoutFormatter.format(shippingHandling));
                $('#sidebar-tax').text(checkoutFormatter.format(tax));
                $('#sidebar-total').text(checkoutFormatter.format(total));

                $('#review-item-qty').text('Solid oak veneer + powder-coated steel · Qty ' + checkoutQty);
                $('#review-item-price').text(checkoutFormatter.format(subtotal));
                $('#review-subtotal').text(checkoutFormatter.format(subtotal));
                $('#review-delivery').text(deliveryText);
                $('#review-shipping').text(checkoutFormatter.format(shippingHandling));
                $('#review-tax').text(checkoutFormatter.format(tax));
                $('#review-total').text(checkoutFormatter.format(total));
            }

            updateCheckoutPrices();

            // Delivery toggle
            $('.delivery-option').on('click', function () {
                $('.delivery-option').removeClass('selected');
                $(this).addClass('selected');
                checkoutExpressDelivery = $(this).find('input').val() === 'express';
                updateCheckoutPrices();
            });

            // Simple inline validation helper
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
                if ($(this).val().trim()) {
                    $(this).removeClass('invalid');
                }
            });

            function advanceTo(stepIndex, $unlockSection) {
                $steps.each(function (i) {
                    $(this).toggleClass('active', i === stepIndex);
                    $(this).toggleClass('completed', i < stepIndex);
                });
                $unlockSection.removeClass('locked-section');
                $('html, body').animate({ scrollTop: $unlockSection.offset().top - 130 }, 400);
            }

            $toPaymentBtn.on('click', function () {
                if (!validateSection($sectionShip)) return;
                advanceTo(1, $sectionPay);
            });

            $toReviewBtn.on('click', function () {
                if (!validateSection($sectionPay)) return;
                advanceTo(2, $sectionRev);
            });

            $placeOrder.on('click', function () {
                $modal.removeAttr('hidden');
            });

            // Card number formatting
            $('#card-number').on('input', function () {
                let val = $(this).val().replace(/\D/g, '').substring(0, 16);
                val = val.replace(/(.{4})/g, '$1 ').trim();
                $(this).val(val);
            });

            // Expiry formatting
            $('#card-expiry').on('input', function () {
                let val = $(this).val().replace(/\D/g, '').substring(0, 4);
                if (val.length >= 3) val = val.substring(0, 2) + ' / ' + val.substring(2);
                $(this).val(val);
            });
        }
    });
})(jQuery);
