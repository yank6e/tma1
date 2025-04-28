// Инициализация Telegram WebApp
const tg = window.Telegram.WebApp;

// Получение ID пользователя из Telegram
const userId = tg.initDataUnsafe?.user?.id || 'guest';

// Загрузка данных из LocalStorage
let cart = JSON.parse(localStorage.getItem(`cart_${userId}`)) || [];
let orderHistory = JSON.parse(localStorage.getItem(`orderHistory_${userId}`)) || [];
let profile = JSON.parse(localStorage.getItem(`profile_${userId}`)) || { firstName: '', lastName: '' };

// Обновляем счетчик корзины и инициализируем страницы
updateCartCount();
if (window.location.pathname.includes('cart.html')) {
    displayCart();
    loadDeliveryForm();
} else if (window.location.pathname.includes('history.html')) {
    displayOrderHistory();
} else if (window.location.pathname.includes('profile.html')) {
    loadProfileForm();
}

// Добавление товара в корзину
function addToCart(id, name, price) {
    const existingItem = cart.find(item => item.id === id);
    
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({ id, name, price, quantity: 1 });
    }
    
    localStorage.setItem(`cart_${userId}`, JSON.stringify(cart));
    updateCartCount();
    tg.showAlert(`Добавлено: ${name}`);
}

// Удаление товара из корзины
function removeFromCart(id) {
    cart = cart.filter(item => item.id !== id);
    localStorage.setItem(`cart_${userId}`, JSON.stringify(cart));
    updateCartCount();
    displayCart();
}

// Изменение количества товара
function updateQuantity(id, change) {
    const item = cart.find(item => item.id === id);
    if (item) {
        item.quantity += change;
        if (item.quantity <= 0) {
            removeFromCart(id);
        } else {
            localStorage.setItem(`cart_${userId}`, JSON.stringify(cart));
            updateCartCount();
            displayCart();
        }
    }
}

// Отображение корзины
function displayCart() {
    const cartItemsDiv = document.getElementById('cart-items');
    const cartTotalDiv = document.getElementById('cart-total');
    
    if (!cartItemsDiv || !cartTotalDiv) {
        console.error('Cart elements not found');
        return;
    }
    
    if (cart.length === 0) {
        cartItemsDiv.innerHTML = '<p>Корзина пуста</p>';
        cartTotalDiv.innerHTML = '';
        tg.MainButton.hide();
        return;
    }
    
    let total = 0;
    cartItemsDiv.innerHTML = cart.map(item => {
        if (!item || typeof item.price !== 'number' || typeof item.quantity !== 'number') {
            console.warn('Invalid cart item:', item);
            return '';
        }
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        const safeId = encodeURIComponent(item.id);
        return `
            <div class="cart-item">
                <span>${item.name} × ${item.quantity}</span>
                <span>${itemTotal} ₽</span>
                <div>
                    <button onclick="updateQuantity('${safeId}', -1)">-</button>
                    <button onclick="updateQuantity('${safeId}', 1)">+</button>
                    <button onclick="removeFromCart('${safeId}')">Удалить</button>
                </div>
            </div>
        `;
    }).filter(Boolean).join('');
    
    cartTotalDiv.innerHTML = `<div class="total">Итого: ${total} ₽</div>`;
    
    // Показываем кнопку оплаты
    tg.MainButton.setText(`Оплатить ${total} ₽`);
    tg.MainButton.show();
    tg.MainButton.onClick(() => initiatePayment(total));
}

// Загрузка данных в форму доставки
function loadDeliveryForm() {
    const firstNameInput = document.getElementById('firstName');
    const lastNameInput = document.getElementById('lastName');
    
    if (firstNameInput && lastNameInput && profile) {
        firstNameInput.value = profile.firstName || '';
        lastNameInput.value = profile.lastName || '';
    }
}

// Инициация тестовой оплаты
function initiatePayment(total) {
    const payload = JSON.stringify({
        orderId: Date.now(),
        amount: total,
        currency: 'RUB',
        description: 'Оплата заказа в Доставке еды'
    });

    // Симуляция запроса на оплату (без реального провайдера)
    tg.showConfirm(`Тестовая оплата на сумму ${total} ₽. Подтвердить?`, (confirmed) => {
        if (confirmed) {
            submitOrder();
            tg.showAlert('✅ Тестовая оплата прошла успешно!');
        }
    });
}

// Оформление заказа
function submitOrder() {
    const firstName = document.getElementById('firstName')?.value.trim();
    const lastName = document.getElementById('lastName')?.value.trim();
    const address = document.getElementById('address')?.value.trim();
    const comment = document.getElementById('comment')?.value.trim();
    
    if (!firstName || !lastName || !address) {
        tg.showAlert('Пожалуйста, заполните все обязательные поля!');
        return;
    }
    
    if (cart.length === 0) {
        tg.showAlert('Корзина пуста!');
        return;
    }
    
    const order = {
        id: Date.now(),
        items: [...cart],
        total: cart.reduce((sum, item) => sum + (item.price * item.quantity), 0),
        user: tg.initDataUnsafe.user?.username || "Гость",
        firstName,
        lastName,
        address,
        comment,
        date: new Date().toLocaleString('ru-RU')
    };
    
    // Сохраняем заказ в историю
    orderHistory.push(order);
    localStorage.setItem(`orderHistory_${userId}`, JSON.stringify(orderHistory));
    
    // Сохраняем имя и фамилию в профиль
    profile.firstName = firstName;
    profile.lastName = lastName;
    localStorage.setItem(`profile_${userId}`, JSON.stringify(profile));
    
    // Отправляем данные в Telegram бота
    tg.sendData(JSON.stringify(order));
    
    // Очищаем корзину
    cart = [];
    localStorage.setItem(`cart_${userId}`, JSON.stringify(cart));
    updateCartCount();
    displayCart();
    
    tg.MainButton.hide();
    tg.showAlert('✅ Заказ отправлен! Ожидайте доставку.');
    window.location.href = 'index.html';
}

// Отображение истории заказов
function displayOrderHistory() {
    const orderHistoryItemsDiv = document.getElementById('order-history-items');
    
    if (!orderHistoryItemsDiv) {
        console.error('Order history elements not found');
        return;
    }
    
    if (orderHistory.length === 0) {
        orderHistoryItemsDiv.innerHTML = '<p>История заказов пуста</p>';
        return;
    }
    
    orderHistoryItemsDiv.innerHTML = orderHistory.map(order => {
        let itemsHtml = order.items.map(item => `
            <p>${item.name} × ${item.quantity} = ${item.price * item.quantity} ₽</p>
        `).join('');
        
        return `
            <div class="order-history-item">
                <h3>Заказ #${order.id} от ${order.date}</h3>
                ${itemsHtml}
                <p><strong>Итого:</strong> ${order.total} ₽</p>
                <p><strong>Доставка:</strong> ${order.firstName} ${order.lastName}, ${order.address}</p>
                ${order.comment ? `<p><strong>Комментарий:</strong> ${order.comment}</p>` : ''}
            </div>
        `;
    }).join('');
}

// Загрузка данных профиля
function loadProfileForm() {
    const firstNameInput = document.getElementById('profileFirstName');
    const lastNameInput = document.getElementById('profileLastName');
    
    if (firstNameInput && lastNameInput && profile) {
        firstNameInput.value = profile.firstName || '';
        lastNameInput.value = profile.lastName || '';
    }
}

// Сохранение профиля
function saveProfile() {
    const firstName = document.getElementById('profileFirstName')?.value.trim();
    const lastName = document.getElementById('profileLastName')?.value.trim();
    
    if (!firstName || !lastName) {
        tg.showAlert('Пожалуйста, заполните имя и фамилию!');
        return;
    }
    
    profile.firstName = firstName;
    profile.lastName = lastName;
    localStorage.setItem(`profile_${userId}`, JSON.stringify(profile));
    
    tg.showAlert('✅ Профиль сохранен!');
}

// Обновление счетчика корзины
function updateCartCount() {
    const totalItems = cart.reduce((sum, item) => sum + (item.quantity || 0), 0);
    const cartCounts = document.querySelectorAll('#cart-count');
    cartCounts.forEach(cartCount => {
        if (cartCount) cartCount.textContent = totalItems;
    });
}