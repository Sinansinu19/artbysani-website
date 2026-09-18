(function () {
    const CART_KEY = 'artbysaniCart';
    const CART_ORDERS_KEY = 'cartOrders';

    function readCart() {
        try {
            return JSON.parse(localStorage.getItem(CART_KEY)) || [];
        } catch (error) {
            return [];
        }
    }

    function showCartNotice(message) {
        const notice = document.getElementById('cartNotice');
        if (!notice) return;
        notice.textContent = message;
        notice.classList.add('visible');
        window.clearTimeout(showCartNotice.timeoutId);
        showCartNotice.timeoutId = window.setTimeout(() => {
            notice.classList.remove('visible');
        }, 2600);
    }

    function writeCart(cart) {
        localStorage.setItem(CART_KEY, JSON.stringify(cart));
    }

    function formatCurrency(value) {
        return `₹${Number(value).toLocaleString('en-IN')}`;
    }

    function updateCartBadge() {
        const badge = document.getElementById('cartBadge');
        if (!badge) return;
        const cart = readCart();
        const count = cart.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
        badge.textContent = count;
        badge.style.display = count > 0 ? 'inline-flex' : 'none';
    }

    function renderCartDrawer() {
        const cartBody = document.querySelector('.cart-body');
        const subtotalEl = document.getElementById('cartSubtotal');
        if (!cartBody || !subtotalEl) return;

        const cart = readCart();
        const subtotal = cart.reduce((sum, item) => sum + Number(item.price) * Number(item.quantity || 1), 0);
        subtotalEl.textContent = formatCurrency(subtotal);

        if (!cart.length) {
            cartBody.innerHTML = '<p class="empty-cart-text">Your shopping bag is currently empty.</p>';
            return;
        }

        cartBody.innerHTML = cart.map(item => `
            <div class="cart-item" data-name="${item.name}">
                <img src="${item.image || 'https://via.placeholder.com/120x90'}" alt="${item.name}" class="cart-item-image">
                <div class="cart-item-details">
                    <div class="cart-item-header">
                        <span class="cart-item-name">${item.name}</span>
                        <button class="cart-remove-btn" data-name="${item.name}" aria-label="Remove ${item.name}">Remove</button>
                    </div>
                    <div class="cart-item-meta">
                        <span class="cart-item-price">${formatCurrency(item.price)}</span>
                        <div class="quantity-control">
                            <button class="qty-btn" data-name="${item.name}" data-change="-1" aria-label="Decrease quantity">-</button>
                            <span class="qty-value">${item.quantity}</span>
                            <button class="qty-btn" data-name="${item.name}" data-change="1" aria-label="Increase quantity">+</button>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');

        cartBody.querySelectorAll('.qty-btn').forEach(button => {
            button.addEventListener('click', () => {
                const name = button.dataset.name;
                const change = Number(button.dataset.change || 0);
                changeCartQuantity(name, change);
            });
        });

        cartBody.querySelectorAll('.cart-remove-btn').forEach(button => {
            button.addEventListener('click', () => {
                removeCartItem(button.dataset.name);
            });
        });
    }

    function addToCart(productName, price, image = '', quantity = 1) {
        const cart = readCart();
        const normalizedPrice = Number(price || 0);
        const existingIndex = cart.findIndex(item => item.name === productName);

        if (existingIndex >= 0) {
            cart[existingIndex].quantity = Number(cart[existingIndex].quantity || 0) + Number(quantity || 1);
            cart[existingIndex].price = normalizedPrice;
            if (image) cart[existingIndex].image = image;
        } else {
            cart.push({
                name: productName,
                price: normalizedPrice,
                image,
                quantity: Number(quantity || 1)
            });
        }

        writeCart(cart);
        updateCartBadge();
        renderCartDrawer();
        return cart;
    }

    function changeCartQuantity(productName, delta) {
        const cart = readCart();
        const index = cart.findIndex(item => item.name === productName);
        if (index === -1) return;

        cart[index].quantity = Number(cart[index].quantity || 1) + Number(delta || 0);
        if (cart[index].quantity <= 0) {
            cart.splice(index, 1);
        }

        writeCart(cart);
        updateCartBadge();
        renderCartDrawer();
    }

    function removeCartItem(productName) {
        const cart = readCart().filter(item => item.name !== productName);
        writeCart(cart);
        updateCartBadge();
        renderCartDrawer();
    }

    function openCartDrawer() {
        const cartOverlay = document.getElementById('cartOverlay');
        if (cartOverlay) {
            renderCartDrawer();
            cartOverlay.style.display = 'flex';
        }
    }

    function closeCartDrawer() {
        const cartOverlay = document.getElementById('cartOverlay');
        if (cartOverlay) {
            cartOverlay.style.display = 'none';
        }
    }

    function buyNow(productName, price, image) {
        addToCart(productName, price, image, 1);
        openCartDrawer();
    }

    function proceedToCheckout() {
        window.location.href = 'profile.html';
    }

    function persistCartOrder(channel) {
        const cart = readCart();
        if (!cart.length) return;

        const order = {
            id: Date.now(),
            channel,
            createdAt: new Date().toISOString(),
            items: cart.map(item => ({
                name: item.name,
                quantity: Number(item.quantity || 1),
                price: Number(item.price || 0)
            })),
            subtotal: cart.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 1), 0)
        };

        const previousOrders = JSON.parse(localStorage.getItem(CART_ORDERS_KEY)) || [];
        previousOrders.unshift(order);
        localStorage.setItem(CART_ORDERS_KEY, JSON.stringify(previousOrders));
    }

    function clearCart() {
        writeCart([]);
        updateCartBadge();
        renderCartDrawer();
    }

    function orderViaWhatsApp() {
        const cart = readCart();
        if (!cart.length) {
            showCartNotice('Your cart is empty. Add a few pieces to continue.');
            return;
        }

        const header = "Hi! I'd like to order the following item(s) from ArtBySani:";
        const lines = cart.map(item => `${item.name} — Qty: ${item.quantity} — Price: ${formatCurrency(item.price)} (Please see the product photo I'll share next)`);
        const subtotal = cart.reduce((sum, item) => sum + Number(item.price) * Number(item.quantity || 1), 0);
        const footer = `Subtotal: ${formatCurrency(subtotal)}\n\nI'll attach a screenshot of the product below.`;
        const messageText = `${header}\n\n${lines.join('\n')}\n\n${footer}`;
        const message = encodeURIComponent(messageText);

        persistCartOrder('WhatsApp');
        clearCart();
        // Open WhatsApp and remind the customer to attach a screenshot
        window.open(`https://wa.me/919481319207?text=${message}`, '_blank');
        showCartNotice("Opening WhatsApp. Don't forget to attach a screenshot of the product before sending!");
        closeCartDrawer();
    }

    function orderViaInstagram() {
        console.log('Instagram order button clicked');

        // Open Instagram immediately to avoid popup blockers (must be a direct user action)
        const instagramWindow = window.open('https://www.instagram.com/artbysani._', '_blank');

        try {
            const cart = readCart();
            if (!cart.length) {
                showCartNotice('Your cart is empty. Add a few pieces to continue.');
                return;
            }

            const header = "Hi! I'd like to order the following item(s) from ArtBySani:";
            const lines = cart.map(item => `${item.name} — Qty: ${item.quantity} — Price: ${formatCurrency(item.price)} (Please see the product photo I'll share next)`);
            const subtotal = cart.reduce((sum, item) => sum + Number(item.price) * Number(item.quantity || 1), 0);
            const footer = `Subtotal: ${formatCurrency(subtotal)}\n\nI'll attach a screenshot of the product below.`;
            const messageText = `${header}\n\n${lines.join('\n')}\n\n${footer}`;

            persistCartOrder('Instagram');
            clearCart();

            // Notify user and attempt to copy message into clipboard (non-blocking)
            if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(messageText).then(() => {
                    showCartNotice("Order message copied to clipboard. Instagram opened in a new tab.");
                }).catch(() => {
                    showCartNotice("Instagram opened. Please paste the order message and attach a screenshot.");
                    alert('Please copy and paste the following order message into Instagram DM:\n\n' + messageText);
                });
            } else {
                showCartNotice("Instagram opened. Please paste the order message and attach a screenshot.");
                alert('Please copy and paste the following order message into Instagram DM:\n\n' + messageText);
            }
        } catch (err) {
            console.error('Error while preparing Instagram order:', err);
        } finally {
            try { closeCartDrawer(); } catch (e) { /* ignore */ }
        }
    }

    function initProfileMenu() {
        const profileLink = document.getElementById('profileIconLink');
        const profileMenu = document.getElementById('profileMenu');
        if (!profileLink || !profileMenu) return;

        const setProfileState = (isOpen) => {
            profileMenu.classList.toggle('show', isOpen);
            profileLink.setAttribute('aria-expanded', String(isOpen));
        };

        profileLink.addEventListener('click', function (event) {
            event.preventDefault();
            const isOpen = !profileMenu.classList.contains('show');
            setProfileState(isOpen);
        });

        profileMenu.querySelectorAll('.profile-option').forEach(button => {
            button.addEventListener('click', function () {
                const target = button.getAttribute('data-target');
                if (target) {
                    window.location.href = target;
                }
            });
        });

        document.addEventListener('click', function (event) {
            const clickedInsideMenu = profileMenu.contains(event.target);
            const clickedOnProfile = profileLink.contains(event.target);
            if (!clickedInsideMenu && !clickedOnProfile) {
                setProfileState(false);
            }
        });
    }

    function initHamburgerMenu() {
        const menuToggle = document.getElementById('menuToggle');
        const mobileNav = document.getElementById('mobileNav');
        if (!menuToggle || !mobileNav) return;

        const setMenuState = (isOpen) => {
            mobileNav.classList.toggle('is-open', isOpen);
            menuToggle.setAttribute('aria-expanded', String(isOpen));
            menuToggle.innerHTML = isOpen ? '<i class="fas fa-times"></i>' : '<i class="fas fa-bars"></i>';
        };

        menuToggle.addEventListener('click', function (event) {
            event.preventDefault();
            const isOpen = !mobileNav.classList.contains('is-open');
            setMenuState(isOpen);
        });

        document.addEventListener('click', function (event) {
            if (!mobileNav.contains(event.target) && !menuToggle.contains(event.target)) {
                setMenuState(false);
            }
        });

        const mobileCustomOrderTrigger = document.getElementById('mobileCustomOrderTrigger');
        const mobileContactTrigger = document.getElementById('mobileContactTrigger');
        if (mobileCustomOrderTrigger) {
            mobileCustomOrderTrigger.addEventListener('click', function (event) {
                event.preventDefault();
                setMenuState(false);
                const overlay = document.getElementById('customOrderOverlay');
                if (overlay) overlay.style.display = 'flex';
            });
        }
        if (mobileContactTrigger) {
            mobileContactTrigger.addEventListener('click', function (event) {
                event.preventDefault();
                setMenuState(false);
                const overlay = document.getElementById('contactOverlay');
                if (overlay) overlay.style.display = 'flex';
            });
        }
    }

    function initCartUI() {
        updateCartBadge();
        renderCartDrawer();
        initHamburgerMenu();
        initProfileMenu();

        const cartTrigger = document.getElementById('cartTrigger');
        const closeCart = document.getElementById('closeCart');
        const cartOverlay = document.getElementById('cartOverlay');

        if (cartTrigger) {
            cartTrigger.addEventListener('click', function (event) {
                event.preventDefault();
                openCartDrawer();
            });
        }

        if (closeCart) {
            closeCart.addEventListener('click', closeCartDrawer);
        }

        if (cartOverlay) {
            cartOverlay.addEventListener('click', function (event) {
                if (event.target === cartOverlay) closeCartDrawer();
            });
        }

        const searchTrigger = document.getElementById('searchTrigger');
        const searchOverlay = document.getElementById('searchOverlay');
        const closeSearch = document.getElementById('closeSearch');
        if (searchTrigger) {
            searchTrigger.addEventListener('click', function (event) {
                event.preventDefault();
                if (searchOverlay) searchOverlay.style.display = 'flex';
            });
        }
        if (closeSearch) {
            closeSearch.addEventListener('click', function () {
                if (searchOverlay) searchOverlay.style.display = 'none';
            });
        }

        const customOrderTrigger = document.getElementById('customOrderTrigger');
        const customOrderOverlay = document.getElementById('customOrderOverlay');
        const closeCustomOrder = document.getElementById('closeCustomOrder');
        if (customOrderTrigger) {
            customOrderTrigger.addEventListener('click', function (event) {
                event.preventDefault();
                if (customOrderOverlay) customOrderOverlay.style.display = 'flex';
            });
        }
        if (closeCustomOrder) {
            closeCustomOrder.addEventListener('click', function () {
                if (customOrderOverlay) customOrderOverlay.style.display = 'none';
            });
        }

        const contactTrigger = document.getElementById('contactTrigger');
        const contactOverlay = document.getElementById('contactOverlay');
        const closeContact = document.getElementById('closeContact');
        if (contactTrigger) {
            contactTrigger.addEventListener('click', function (event) {
                event.preventDefault();
                if (contactOverlay) contactOverlay.style.display = 'flex';
            });
        }
        if (closeContact) {
            closeContact.addEventListener('click', function () {
                if (contactOverlay) contactOverlay.style.display = 'none';
            });
        }

        if (searchOverlay) {
            searchOverlay.addEventListener('click', function (event) {
                if (event.target === searchOverlay) searchOverlay.style.display = 'none';
            });
        }
        if (customOrderOverlay) {
            customOrderOverlay.addEventListener('click', function (event) {
                if (event.target === customOrderOverlay) customOrderOverlay.style.display = 'none';
            });
        }
        if (contactOverlay) {
            contactOverlay.addEventListener('click', function (event) {
                if (event.target === contactOverlay) contactOverlay.style.display = 'none';
            });
        }
    }

    window.addToCart = addToCart;
    window.buyNow = buyNow;
    window.openCartDrawer = openCartDrawer;
    window.removeCartItem = removeCartItem;
    window.changeCartQuantity = changeCartQuantity;
    window.proceedToCheckout = proceedToCheckout;
    window.orderViaWhatsApp = orderViaWhatsApp;
    window.orderViaInstagram = orderViaInstagram;
    window.initCartUI = initCartUI;

    document.addEventListener('DOMContentLoaded', initCartUI);
})();
