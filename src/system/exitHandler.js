import statistics from "../monitoring/statistics.js";
import logger from "../logging/logger.js";
import { FormattingUtils } from "../utils/index.js";

/**
 * Exit Handler - Manages program termination and cleanup
 */
class ExitHandler {
    constructor() {
        this.isExiting = false;
        this.exitHandlers = new Set();
        this.setupExitListeners();
    }

    /**
     * Setup exit event listeners
     */
    setupExitListeners() {
        // Handle Ctrl+C
        process.on('SIGINT', () => this.handleExit('SIGINT'));

        // Handle termination signal
        process.on('SIGTERM', () => this.handleExit('SIGTERM'));

        // Handle normal exit
        process.on('exit', () => this.handleExit('exit'));

        // Handle uncaught exceptions
        process.on('uncaughtException', (err) => {
            console.error('❌ Uncaught Exception:', err);
            this.handleExit('uncaughtException', err);
        });

        // Handle unhandled promise rejections
        process.on('unhandledRejection', (reason, promise) => {
            console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
            this.handleExit('unhandledRejection', reason);
        });
    }

    /**
     * Handle program exit
     * @param {string} signal - Exit signal type
     * @param {Error} error - Error object if applicable
     */
    async handleExit(signal, error = null) {
        if (this.isExiting) {
            return;
        }

        this.isExiting = true;
        console.log(`\n🔄 Program termination signal received: ${signal}`);

        try {
            // Generate and display session summary
            await this.generateExitSummary();

            // Run custom exit handlers
            await this.runExitHandlers();

            console.log("✅ Cleanup completed successfully!");
        } catch (exitError) {
            console.error(`❌ Error during exit cleanup: ${exitError.message}`);
        }

        console.log("👋 Goodbye!");

        // Force exit after cleanup
        if (signal !== 'exit') {
            process.exit(error ? 1 : 0);
        }
    }

    /**
     * Generate comprehensive exit summary
     */
    async generateExitSummary() {
        try {
            console.log("📊 Generating session summary before exit...");

            // Generate comprehensive summary
            const summary = await statistics.generateProfitLossSummary();

            if (summary) {
                // Display summary in console
                await statistics.displaySessionSummary();

                // Save to separate file
                await logger.writeSummaryToFile(summary);

                // Append to trades.log
                await logger.appendSummaryToTradesLog(summary);

                console.log("✅ Session summary completed successfully!");
            } else {
                console.log("⚠️  No trades found to summarize");
            }
        } catch (error) {
            console.error(`❌ Error generating exit summary: ${error.message}`);
        }
    }

    /**
     * Add custom exit handler
     * @param {Function} handler - Exit handler function
     */
    addExitHandler(handler) {
        if (typeof handler === 'function') {
            this.exitHandlers.add(handler);
        }
    }

    /**
     * Remove custom exit handler
     * @param {Function} handler - Exit handler function to remove
     */
    removeExitHandler(handler) {
        this.exitHandlers.delete(handler);
    }

    /**
     * Run all registered exit handlers
     */
    async runExitHandlers() {
        if (this.exitHandlers.size === 0) {
            return;
        }

        console.log(`🔄 Running ${this.exitHandlers.size} custom exit handlers...`);

        const promises = Array.from(this.exitHandlers).map(async(handler) => {
            try {
                await handler();
            } catch (error) {
                console.error(`❌ Exit handler error: ${error.message}`);
            }
        });

        await Promise.allSettled(promises);
    }

    /**
     * Force exit with summary generation
     */
    async forceExit() {
        await this.handleExit('manual');
    }

    /**
     * Check if program is currently exiting
     * @returns {boolean} True if program is exiting
     */
    isExitingNow() {
        return this.isExiting;
    }

    /**
     * Get exit handler status
     * @returns {object} Exit handler status information
     */
    getStatus() {
        return {
            isExiting: this.isExiting,
            exitHandlersCount: this.exitHandlers.size,
            isSetup: true
        };
    }
}

// Create singleton instance
const exitHandler = new ExitHandler();

export default exitHandler;
export { ExitHandler };