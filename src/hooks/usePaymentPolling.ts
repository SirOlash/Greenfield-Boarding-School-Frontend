import { useEffect, useRef } from 'react';

/**
 * A custom hook to perform periodic polling.
 * 
 * @param callback The function to call on each interval
 * @param enabled Whether polling is active
 * @param interval The interval in milliseconds (defaults to 5000)
 */
export const usePaymentPolling = (
    callback: () => void,
    enabled: boolean,
    interval: number = 5000
) => {
    const savedCallback = useRef(callback);

    // Update fixed callback if it changes
    useEffect(() => {
        savedCallback.current = callback;
    }, [callback]);

    // Set up the interval
    useEffect(() => {
        if (!enabled) return;

        // Initial call
        // savedCallback.current(); // Optional: call immediately when enabled

        const id = setInterval(() => {
            savedCallback.current();
        }, interval);

        return () => clearInterval(id);
    }, [enabled, interval]);
};

export default usePaymentPolling;
