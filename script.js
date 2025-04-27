// Инициализация Telegram WebApp
const tg = window.Telegram.WebApp;

// Загрузка корзины из LocalStorage
let cart = JSON.parse(localStorage.getItem('cart')) || [];

// Обновляем счетчик корзины
updateCartCount();

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

// Открытие корзины (можно сделать модалку или отдельную страницу)
function openCart() {
    if (cart.length === 0) {
        tg.showAlert("Корзина пуста!");
        return;
    }
    
    let message = "🛒 Ваш заказ:\n\n";
    let total = 0;
    
    cart.forEach(item => {
        const itemTotal = item.price * item.quantity;
        message += `${item.name} × ${item.quantity} = ${itemTotal} ₽\n`;
        total += itemTotal;
    });
    
    message += `\n💳 Итого: ${total} ₽`;
    
    // Показываем подтверждение заказа
    tg.showConfirm(message, (isConfirmed) => {
        if (isConfirmed) {
            checkout();
        }
    });
}

// Оформление заказа (отправка боту)
function checkout() {
    const order = {
        items: cart,
        total: cart.reduce((sum, item) => sum + (item.price * item.quantity), 0),
        user: tg.initDataUnsafe.user?.username || "Гость",
    };
    
    // Отправляем данные в Telegram бота
    tg.sendData(JSON.stringify(order));
    
    // Очищаем корзину
    cart = [];
    localStorage.removeItem('cart');
    updateCartCount();
    
    tg.showAlert("✅ Заказ отправлен! Ожидайте доставку.");
}

// Обновление счетчика корзины
function updateCartCount() {
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    document.getElementById('cart-count').textContent = totalItems;
}