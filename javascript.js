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

            var closeMenu = function () { $n.removeClass('is-open'); };

            $toggle.on('click', function () { $n.toggleClass('is-open'); });

            $links.find('a').on('click', function () {
                if (window.matchMedia('(max-width: 767px)').matches) closeMenu();
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
                try { window.localStorage.setItem('cartQty', String(qty)); } catch (e) {}
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
            var cartHasItem     = true;

            var parseCurrency = function (v) { return Number(String(v).replace(/[^0-9.-]/g, '')) || 0; };
            var formatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 });

            var unitPrice = parseCurrency($subtotal.text());
            var baseTax   = parseCurrency($tax.text());
            var taxRate   = unitPrice > 0 ? baseTax / unitPrice : 0;

            var params        = new URLSearchParams(window.location.search);
            var qtyFromQuery  = parseInt(params.get('qty'), 10);
            var qtyFromStorage;
            try { qtyFromStorage = parseInt(window.localStorage.getItem('cartQty'), 10); } catch (e) { qtyFromStorage = NaN; }

            var requestedQty = Number.isFinite(qtyFromQuery) ? qtyFromQuery : (Number.isFinite(qtyFromStorage) ? qtyFromStorage : NaN);

            if (Number.isFinite(requestedQty)) {
                var maxQty = Math.max.apply(null, $cartQty.find('option').map(function () { return parseInt($(this).val(), 10) || 1; }).get());
                $cartQty.val(String(Math.min(Math.max(requestedQty, 1), maxQty || 1)));
            }

            var updateCartTotals = function () {
                if (!cartHasItem) return;
                var qty           = Math.max(parseInt($cartQty.val(), 10) || 1, 1);
                var subtotal      = Math.round(unitPrice * qty);
                var estimatedTax  = Math.round(subtotal * taxRate);
                var orderTotal    = subtotal + estimatedTax;
                var itemLabel     = qty === 1 ? 'Item' : 'Items';
                $itemTotal.text(formatter.format(subtotal));
                $subtotal.text(formatter.format(subtotal));
                $tax.text(formatter.format(estimatedTax));
                $total.text(formatter.format(orderTotal));
                $itemsCount.text(itemLabel + ' (' + qty + ')');
            };

            $cartQty.on('change input', updateCartTotals);

            $removeItem.on('click', function (e) {
                e.preventDefault();
                cartHasItem = false;
                $itemCard.attr('hidden', true).hide();
                $emptyState.removeAttr('hidden');
                $itemsCount.text('Items (0)');
                $itemTotal.text(formatter.format(0));
                $subtotal.text(formatter.format(0));
                $tax.text(formatter.format(0));
                $total.text(formatter.format(0));
                if ($delivery.length) $delivery.text(formatter.format(0));
                if ($checkoutButton.length) {
                    $checkoutButton.addClass('is-disabled').attr('aria-disabled', 'true').attr('tabindex', '-1');
                }
            });

            $checkoutButton.on('click', function (e) {
                if ($(this).hasClass('is-disabled')) e.preventDefault();
            });

            updateCartTotals();
        }

    });
})(jQuery);
