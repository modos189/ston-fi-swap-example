import express from 'express';
import morgan from 'morgan';
import { env } from 'process';

import routes from './api/routes.js';
import { PriceService } from './services/price.service.js';
import { SwapService } from './services/swap.service.js';

declare global {
    namespace Express {
        interface Request {
            swapService: SwapService;
            priceService: PriceService;
        }
    }
}

const app = express();
const port = env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(morgan('dev')); // Логирование в stdout

// Инициализация сервисов
const priceService = new PriceService();
const swapService = await SwapService.createSwapService();

// Добавляем сервисы в request
app.use((req, res, next) => {
    req.swapService = swapService;
    req.priceService = priceService;
    next();
});

// Подключаем API маршруты
app.use('/api/v1', routes);

// Базовая проверка работоспособности
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

// Запуск сервера
app.listen(port, () => {
    // eslint-disable-next-line no-undef
    console.log(`🚀 Сервер запущен на порту ${port}`);
});

export default app;