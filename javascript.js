(function ($) {
    $(function () {

        // ─── Scroll-aware nav ────────────────────────────────────────────────
        // The nav should use a light tone over dark page artwork, and switch to
        // a darker tone when the page content below it becomes lighter.
        var $nav = $('.top-nav');
        var $hero = $('.video-hero');

        function getEffectiveBgColor(element) {
            while (element && element !== document.documentElement) {
                var style = window.getComputedStyle(element);
                var bg = style.backgroundColor;
                if (bg && bg !== 'transparent' && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'inherit') {
                    return bg;
                }
                element = element.parentElement;
            }
            return window.getComputedStyle(document.body).backgroundColor || 'rgb(255, 255, 255)';
        }

        function parseRgb(colorString) {
            var match = colorString.match(/rgba?\(([^)]+)\)/i);
            if (!match) return null;
            var parts = match[1].split(',').map(function (part) { return parseFloat(part.trim()); });
            return {
                r: parts[0] || 0,
                g: parts[1] || 0,
                b: parts[2] || 0,
                a: parts[3] === undefined ? 1 : parts[3]
            };
        }

        function getLuminance(rgb) {
            function channel(v) {
                v = v / 255;
                return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
            }
            return 0.2126 * channel(rgb.r) + 0.7152 * channel(rgb.g) + 0.0722 * channel(rgb.b);
        }

        function isDarkBackground(colorString) {
            var rgb = parseRgb(colorString);
            if (!rgb) return false;
            return getLuminance(rgb) < 0.55;
        }

        function elementBelowNav(x, y) {
            var elements = document.elementsFromPoint(x, y);
            for (var i = 0; i < elements.length; i += 1) {
                if (!elements[i].closest || !elements[i].closest('.top-nav')) {
                    return elements[i];
                }
            }
            return null;
        }

        function updateNavOnScroll() {
            var navRect = $nav[0].getBoundingClientRect();

            if ($hero.length) {
                var heroRect = $hero[0].getBoundingClientRect();
                var navOverHero = heroRect.bottom > navRect.top && heroRect.top < navRect.bottom;
                if (navOverHero) {
                    $nav.removeClass('is-scrolled');
                    return;
                }
            }

            var sampleY = Math.min(navRect.bottom + 4, window.innerHeight - 1);
            var sampleXs = [navRect.left + navRect.width * 0.25, navRect.left + navRect.width * 0.5, navRect.left + navRect.width * 0.75];
            var darkCount = 0;
            var sampleCount = 0;

            sampleXs.forEach(function (x) {
                if (x < 0 || x > window.innerWidth || sampleY < 0) return;
                var element = elementBelowNav(x, sampleY);
                if (!element) return;
                var bgColor = getEffectiveBgColor(element);
                if (bgColor) {
                    sampleCount += 1;
                    if (isDarkBackground(bgColor)) {
                        darkCount += 1;
                    }
                }
            });

            var isDarkUnderneath = sampleCount > 0 ? darkCount >= Math.ceil(sampleCount / 2) : false;
            if (isDarkUnderneath) {
                $nav.removeClass('is-scrolled');
            } else {
                $nav.addClass('is-scrolled');
            }
        }

        $(window).on('scroll resize', updateNavOnScroll);
        updateNavOnScroll(); // run once immediately on page load

        // ─── Nav cart quantity badge ───────────────────────────────────────
        var $navCartLinks = $('.nav-cart-link');

        function getStoredCartQty() {
            try {
                var hasItem = window.localStorage.getItem('cartHasItem') === 'true';
                if (!hasItem) return 0;
                var qty = parseInt(window.localStorage.getItem('cartQty'), 10);
                return Number.isFinite(qty) && qty > 0 ? qty : 0;
            } catch (e) {
                return 0;
            }
        }

        function updateNavCartIndicator() {
            if (!$navCartLinks.length) return;

            var qty = getStoredCartQty();
            $navCartLinks.each(function () {
                var $link = $(this);
                var $badge = $link.find('.nav-cart-count');
                if (!$badge.length) {
                    $badge = $('<span class="nav-cart-count" aria-hidden="true" hidden></span>');
                    $link.append($badge);
                }

                if (qty > 0) {
                    $badge.text(qty > 99 ? '99+' : String(qty)).removeAttr('hidden');
                    $link.addClass('has-count').attr('aria-label', 'Go to cart (' + qty + ' item' + (qty === 1 ? '' : 's') + ')');
                } else {
                    $badge.text('').attr('hidden', true);
                    $link.removeClass('has-count').attr('aria-label', 'Go to cart');
                }
            });
        }

        updateNavCartIndicator();
        $(window).on('storage', updateNavCartIndicator);

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
                updateNavCartIndicator();
            });
        }

        // Retail gallery thumbnails
        var $galleryMainImage = $('.gallery-main img');
        var $galleryThumbs    = $('.gallery-thumbs img');
        if ($galleryMainImage.length && $galleryThumbs.length) {
            $galleryThumbs.on('click', function () {
                var $thumb = $(this);
                $galleryMainImage.attr({
                    src: $thumb.attr('src'),
                    alt: $thumb.attr('alt')
                });
                $galleryThumbs.removeClass('is-active').removeAttr('aria-current');
                $thumb.addClass('is-active').attr('aria-current', 'true');
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
                updateNavCartIndicator();
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
                updateNavCartIndicator();
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

            function isNameField($field) {
                return $field.is('#first-name, #last-name, #card-name');
            }

            function isValidName(value) {
                return /^[A-Za-z]+([ .'-][A-Za-z]+)*\.?$/.test(value);
            }

            function isValidEmail(value) {
                return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
            }

            function validateSection($section) {
                let valid = true;
                $section.find('input[required], select[required]').each(function () {
                    const $field = $(this);
                    const value = $field.val().trim();

                    if (!value) {
                        $field.addClass('invalid');
                        valid = false;
                        return;
                    }

                    if ($field.is('#phone') && value.replace(/\D/g, '').length !== 10) {
                        $field.addClass('invalid');
                        valid = false;
                        return;
                    }

                    if (isNameField($field) && !isValidName(value)) {
                        $field.addClass('invalid');
                        valid = false;
                        return;
                    }

                    if ($field.is('#email') && !isValidEmail(value)) {
                        $field.addClass('invalid');
                        valid = false;
                        return;
                    }

                    if ($field.is('#card-cvv') && !/^\d{3,4}$/.test(value)) {
                        $field.addClass('invalid');
                        valid = false;
                        return;
                    }

                    $field.removeClass('invalid');
                });
                return valid;
            }

            $('input').on('input', function () {
                const $field = $(this);
                const value = $field.val().trim();

                if (!value) return;
                if ($field.is('#phone') && value.replace(/\D/g, '').length !== 10) return;
                if (isNameField($field) && !isValidName(value)) return;
                if ($field.is('#email') && !isValidEmail(value)) return;
                if ($field.is('#card-cvv') && !/^\d{3,4}$/.test(value)) return;

                $field.removeClass('invalid');
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
                updateNavCartIndicator();
            }

            /* ── Step 1: Shipping ── */
            if ($('.checkout-shipping').length) {
                // Restore saved shipping fields
                restoreFormFromStorage('shipping-form', 'checkoutShipping');

                function formatPhoneDisplay(digits) {
                    const cleaned = String(digits || '').replace(/\D/g, '').substring(0, 10);
                    if (!cleaned.length) return '';
                    if (cleaned.length < 4) return '(' + cleaned;
                    if (cleaned.length < 7) return '(' + cleaned.substring(0, 3) + ') ' + cleaned.substring(3);
                    return '(' + cleaned.substring(0, 3) + ') ' + cleaned.substring(3, 6) + '-' + cleaned.substring(6);
                }

                const $phone = $('#phone');
                if ($phone.length) {
                    $phone.val(formatPhoneDisplay($phone.val()));
                }

                $phone.on('input', function () {
                    const digitsOnly = $(this).val().replace(/\D/g, '').substring(0, 10);
                    $(this).val(formatPhoneDisplay(digitsOnly));
                    if (digitsOnly.length === 10) {
                        $(this).removeClass('invalid');
                    }
                });

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

                $('#card-cvv').on('input', function () {
                    const digitsOnly = $(this).val().replace(/\D/g, '').substring(0, 4);
                    $(this).val(digitsOnly);
                    if (/^\d{3,4}$/.test(digitsOnly)) {
                        $(this).removeClass('invalid');
                    }
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
                    // Also fire the full-screen canvas confetti if available
                    if (typeof window.fireConfetti === 'function') {
                        window.fireConfetti();
                    }
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

// ─── Hero scroll hint ────────────────────────────────────────────────────────
(function () {
    var btn = document.getElementById('hero-scroll-btn');
    if (!btn) return;
    btn.addEventListener('click', function () {
        var target = document.querySelector('.home-sections');
        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });
})();
