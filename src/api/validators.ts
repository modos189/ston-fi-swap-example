import { Request, Response, NextFunction } from 'express';

export const validatePriceRequest = (req: Request, res: Response, next: NextFunction): void => {
    const { token0Symbol, token1Symbol } = req.params;

    if (!token0Symbol || !token1Symbol) {
        res.status(400).json({
            error: 'Необходимо указать оба символа токенов',
        });
        return;
    }

    next();
};

export const validateSwapSimulation = (req: Request, res: Response, next: NextFunction): void => {
    const { tokenAddress, amount } = req.body;

    if (!tokenAddress || typeof tokenAddress !== 'string') {
        res.status(400).json({
            error: 'Необходимо указать адрес токена',
        });
        return;
    }

    if (!amount || typeof amount !== 'number' || amount <= 0) {
        res.status(400).json({
            error: 'Необходимо указать корректную сумму',
        });
        return;
    }

    if (req.body.slippageTolerance !== undefined) {
        const { slippageTolerance } = req.body;
        if (typeof slippageTolerance !== 'number' || slippageTolerance <= 0 || slippageTolerance >= 1) {
            res.status(400).json({ error: 'slippageTolerance должен быть числом между 0 и 1' });
            return;
        }
    }

    next();
};

export const validateSwapExecution = (req: Request, res: Response, next: NextFunction): void => {
    const { simulation } = req.body;

    if (!simulation || !simulation.routerAddress || !simulation.offerUnits || !simulation.minAskUnits) {
        res.status(400).json({
            error: 'Некорректные данные симуляции',
        });
        return;
    }

    next();
};