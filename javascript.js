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
        if (!$cards.length) {
            return;
        }

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
    });
})(jQuery);
