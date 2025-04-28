// Инициализация Telegram WebApp
const tg = window.Telegram.WebApp;

// Загрузка корзины и истории заказов из LocalStorage
let cart = JSON.parse(localStorage.getItem('cart')) || [];
let orderHistory = JSON.parse(localStorage.getItem('orderHistory')) || [];

// Обновляем счетчик корзины при загрузке
updateCartCount();
if (window.location.pathname.includes('cart.html')) {
    displayCart();
}

// Добавление товара в корзину
function addToCart(id, name, price) {
    const existingItem = cart.find(item => item.id === id);
    
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({ id, name, price, quantity: 1 });
    }
    
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartCount();
    tg.showAlert(`Добавлено: ${name}`);
}

// Удаление товара из корзины
function removeFromCart(id) {
    cart = cart.filter(item => item.id !== id);
    localStorage.setItem('cart', JSON.stringify(cart));
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
            localStorage.setItem('cart', JSON.stringify(cart));
            updateCartCount();
            displayCart();
        }
    }
}

// Отображение корзины
function displayCart() {
    const cartItemsDiv = document.getElementById('cart-items');
    const cartTotalDiv = document.getElementById('cart-total');
    
    if (!cartItemsDiv || !cartTotalDiv) return;
    
    if (cart.length === 0) {
        cartItemsDiv.innerHTML = '<p>Корзина пуста</p>';
        cartTotalDiv.innerHTML = '';
        return;
    }
    
    let total = 0;
    cartItemsDiv.innerHTML = cart.map(item => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        return `
            <div class="cart-item">
                <span>${item.name} × ${item.quantity}</span>
                <span>${itemTotal} ₽</span>
                <div>
                    <button onclick="updateQuantity(${item.id}, -1)">-</button>
                    <button onclick="updateQuantity(${item.id}, 1)">+</button>
                    <button onclick="removeFromCart(${item.id})">Удалить</button>
                </div>
            </div>
        `;
    }).join('');
    
    cartTotalDiv.innerHTML = `<div class="total">Итого: ${total} ₽</div>`;
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
    localStorage.setItem('orderHistory', JSON.stringify(orderHistory));
    
    // Отправляем данные в Telegram бота
    tg.sendData(JSON.stringify(order));
    
    // Очищаем корзину
    cart = [];
    localStorage.removeItem('cart');
    updateCartCount();
    displayCart();
    
    tg.showAlert('✅ Заказ отправлен! Ожидайте доставку.');
    window.location.href = 'index.html';
}

// Отображение истории заказов
function showOrderHistory() {
    if (orderHistory.length === 0) {
        tg.showAlert('История заказов пуста!');
        return;
    }
    
    let message = '📜 История заказов:\n\n';
    orderHistory.forEach(order => {
        message += `Заказ #${order.id} от ${order.date}\n`;
        order.items.forEach(item => {
            message += `${item.name} × ${item.quantity} = ${item.price * item.quantity} ₽\n`;
        });
        message += `Итого: ${order.total} ₽\n`;
        message += `Доставка: ${order.firstName} ${order.lastName}, ${order.address}\n`;
        if (order.comment) message += `Комментарий: ${order.comment}\n`;
        message += '------------------------\n';
    });
    
    tg.showAlert(message);
}

// Обновление счетчика корзины
function updateCartCount() {
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    const cartCount = document.getElementById('cart-count');
    if (cartCount) cartCount.textContent = totalItems;
}