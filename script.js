// Wait for the DOM to be fully loaded before running the script
document.addEventListener('DOMContentLoaded', () => {

    // --- DOM ELEMENT SELECTION ---
    const operationForm = document.getElementById('operation-form');
    const opTypeSelect = document.getElementById('opType');
    const buySellFields = document.getElementById('buy-sell-fields');
    const dividendField = document.getElementById('dividend-field');
    const portfolioSummaryDiv = document.getElementById('portfolio-summary');
    const totalDividendsSpan = document.getElementById('total-dividends');
    const dividendsSummaryDiv = document.getElementById('dividends-summary');
    const operationsHistoryDiv = document.getElementById('operations-history');

    // Modal elements
    const messageBox = document.getElementById('message-box');
    const messageBoxOverlay = document.getElementById('message-box-overlay');
    const messageBoxTitle = document.getElementById('message-box-title');
    const messageBoxContent = document.getElementById('message-box-content');
    const messageBoxCloseBtn = document.getElementById('message-box-close');

    // --- STATE MANAGEMENT ---
    let operations = [];
    let proventos = [];
    let currentQuotes = {};

    // --- DATA PERSISTENCE (localStorage) ---

    /**
     * Loads operations and proventos from localStorage.
     */
    const loadDataFromLocalStorage = () => {
        const savedOps = localStorage.getItem('stock_operations');
        const savedProvs = localStorage.getItem('stock_proventos');
        operations = savedOps ? JSON.parse(savedOps) : [];
        proventos = savedProvs ? JSON.parse(savedProvs) : [];
    };

    /**
     * Saves the current operations and proventos arrays to localStorage.
     */
    const saveDataToLocalStorage = () => {
        localStorage.setItem('stock_operations', JSON.stringify(operations));
        localStorage.setItem('stock_proventos', JSON.stringify(proventos));
    };

    // --- MODAL / MESSAGE BOX ---

    /**
     * Displays a message to the user.
     * @param {string} content - The message content.
     * @param {string} type - 'success' or 'error'.
     * @param {string} title - The message title.
     */
    const showMessage = (content, type = 'success', title = 'Informação') => {
        messageBoxTitle.textContent = title;
        messageBoxContent.textContent = content;

        // Clear previous classes
        messageBox.classList.remove('success', 'error');
        messageBoxCloseBtn.classList.remove('bg-green-500', 'hover:bg-green-600', 'bg-red-500', 'hover:bg-red-600');
        messageBoxTitle.classList.remove('text-green-600', 'text-red-600');

        if (type === 'success') {
            messageBox.classList.add('success');
            messageBoxTitle.classList.add('text-green-600');
            messageBoxCloseBtn.classList.add('bg-green-500', 'hover:bg-green-600');
        } else {
            messageBox.classList.add('error');
            messageBoxTitle.classList.add('text-red-600');
            messageBoxCloseBtn.classList.add('bg-red-500', 'hover:bg-red-600');
        }

        messageBox.classList.remove('hidden');
        messageBoxOverlay.classList.remove('hidden');
    };

    /**
     * Closes the message box modal.
     */
    const closeMessageBox = () => {
        messageBox.classList.add('hidden');
        messageBoxOverlay.classList.add('hidden');
    };
    
    // Attach event listeners to close the modal
    messageBoxCloseBtn.addEventListener('click', closeMessageBox);
    messageBoxOverlay.addEventListener('click', closeMessageBox);


    // --- RENDERING LOGIC ---

    /**
     * Main render function to update the entire UI.
     */
    const render = () => {
        renderPortfolio();
        renderProventos();
        renderOperationsHistory();
    };

    /**
     * Renders the portfolio summary table.
     */
    const renderPortfolio = () => {
        const portfolioData = calculatePortfolio();

        if (portfolioData.length === 0) {
            portfolioSummaryDiv.innerHTML = `<p class="text-gray-600">Nenhum ativo no portfólio ainda. Registre uma compra!</p>`;
            return;
        }

        const tableRows = portfolioData.map(item => `
            <tr key="${item.ticker}">
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${item.ticker}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">${item.quantity}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">R$ ${item.averagePrice.toFixed(2)}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">R$ ${item.currentPrice !== 'N/A' ? item.currentPrice.toFixed(2) : 'N/A'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">R$ ${item.currentValue.toFixed(2)}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm ${item.unrealizedProfitLoss >= 0 ? 'text-green-600' : 'text-red-600'}">
                    R$ ${item.unrealizedProfitLoss.toFixed(2)}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm ${item.realizedProfitLoss >= 0 ? 'text-green-600' : 'text-red-600'}">
                    R$ ${item.realizedProfitLoss.toFixed(2)}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-bold ${item.totalProfitLoss >= 0 ? 'text-green-600' : 'text-red-600'}">
                    R$ ${item.totalProfitLoss.toFixed(2)}
                </td>
            </tr>
        `).join('');

        portfolioSummaryDiv.innerHTML = `
            <table class="min-w-full divide-y divide-gray-200 rounded-lg overflow-hidden">
                <thead class="bg-green-100">
                    <tr>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider rounded-tl-lg">Ticker</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Quantidade</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Preço Médio</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Cotação Atual</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Valor Atual</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">L/P Não Realizado</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">L/P Realizado</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider rounded-tr-lg">L/P Total</th>
                    </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">${tableRows}</tbody>
            </table>
        `;
    };

    /**
     * Renders the dividends (proventos) summary table.
     */
    const renderProventos = () => {
        const total = proventos.reduce((sum, prov) => sum + prov.value, 0);
        totalDividendsSpan.textContent = `R$ ${total.toFixed(2)}`;

        if (proventos.length === 0) {
            dividendsSummaryDiv.innerHTML = `<p class="text-gray-600 mt-2">Nenhum provento registrado ainda.</p>`;
            return;
        }

        // Sort proventos by date, newest first
        const sortedProventos = [...proventos].sort((a, b) => new Date(b.date) - new Date(a.date));

        const tableRows = sortedProventos.map(prov => `
            <tr key="${prov.id}">
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${prov.date}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">${prov.ticker}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">${prov.type}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">R$ ${prov.value.toFixed(2)}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    <button data-id="${prov.id}" data-type="provento" class="delete-btn bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-3 rounded-md text-xs transition-all duration-200">
                        Excluir
                    </button>
                </td>
            </tr>
        `).join('');

        dividendsSummaryDiv.innerHTML = `
            <table class="min-w-full divide-y divide-gray-200 rounded-lg overflow-hidden">
                <thead class="bg-purple-100">
                    <tr>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider rounded-tl-lg">Data</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Ticker</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Tipo</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Valor</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider rounded-tr-lg">Ações</th>
                    </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">${tableRows}</tbody>
            </table>
        `;
    };

    /**
     * Renders the full operations history table.
     */
    const renderOperationsHistory = () => {
        if (operations.length === 0) {
            operationsHistoryDiv.innerHTML = `<p class="text-gray-600">Nenhuma operação registrada ainda.</p>`;
            return;
        }

        // Sort operations by date, newest first
        const sortedOperations = [...operations].sort((a, b) => new Date(b.date) - new Date(a.date));

        const tableRows = sortedOperations.map(op => `
            <tr key="${op.id}">
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${op.date}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">${op.ticker}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">${op.type}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">${op.quantity}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">R$ ${op.price.toFixed(2)}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">R$ ${op.brokerage.toFixed(2)}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">R$ ${op.otherFees.toFixed(2)}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                     <button data-id="${op.id}" data-type="operation" class="delete-btn bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-3 rounded-md text-xs transition-all duration-200">
                        Excluir
                    </button>
                </td>
            </tr>
        `).join('');

        operationsHistoryDiv.innerHTML = `
            <table class="min-w-full divide-y divide-gray-200 rounded-lg overflow-hidden">
                <thead class="bg-gray-100">
                    <tr>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider rounded-tl-lg">Data</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Ticker</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Tipo</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Quantidade</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Preço Unitário</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Corretagem</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Outras Taxas</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider rounded-tr-lg">Ações</th>
                    </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">${tableRows}</tbody>
            </table>
        `;
    };


    // --- CALCULATION LOGIC ---

    /**
     * Calculates the current portfolio status based on operations.
     * @returns {Array} - An array of objects representing each asset in the portfolio.
     */
    const calculatePortfolio = () => {
        const portfolio = {};

        // Sort operations by date to process them chronologically
        const sortedOps = [...operations].sort((a, b) => new Date(a.date) - new Date(b.date));

        sortedOps.forEach(op => {
            if (!portfolio[op.ticker]) {
                portfolio[op.ticker] = {
                    quantity: 0,
                    totalCost: 0,
                    averagePrice: 0,
                    realizedProfitLoss: 0,
                };
            }

            const asset = portfolio[op.ticker];
            if (op.type === 'Compra') {
                const purchaseCost = (op.quantity * op.price) + op.brokerage + op.otherFees;
                asset.totalCost += purchaseCost;
                asset.quantity += op.quantity;
            } else if (op.type === 'Venda') {
                const costPerShareSold = asset.averagePrice;
                const saleValue = (op.quantity * op.price) - op.brokerage - op.otherFees;
                const costBasisSold = op.quantity * costPerShareSold;
                
                asset.realizedProfitLoss += (saleValue - costBasisSold);
                asset.quantity -= op.quantity;
                asset.totalCost -= costBasisSold;
                if (asset.quantity < 0) asset.quantity = 0; // Avoid negative quantity
                if (asset.totalCost < 0) asset.totalCost = 0; // Avoid negative cost
            }

            // Recalculate average price
            asset.averagePrice = asset.quantity > 0 ? asset.totalCost / asset.quantity : 0;
        });

        // Map to final format for rendering
        return Object.entries(portfolio)
            .filter(([, data]) => data.quantity > 0 || data.realizedProfitLoss !== 0)
            .map(([tickerSymbol, data]) => {
                const currentPrice = currentQuotes[tickerSymbol] || 0;
                const currentValue = data.quantity * currentPrice;
                const unrealizedProfitLoss = data.quantity > 0 ? (currentValue - data.totalCost) : 0;
                const totalProfitLoss = unrealizedProfitLoss + data.realizedProfitLoss;

                return {
                    ticker: tickerSymbol,
                    quantity: data.quantity,
                    averagePrice: data.averagePrice,
                    currentPrice: currentPrice,
                    currentValue: currentValue,
                    unrealizedProfitLoss: unrealizedProfitLoss,
                    realizedProfitLoss: data.realizedProfitLoss,
                    totalProfitLoss: totalProfitLoss,
                };
            }).sort((a, b) => a.ticker.localeCompare(b.ticker));
    };


    // --- EVENT HANDLERS ---

    /**
     * Handles the submission of the new operation form.
     * @param {Event} e - The form submission event.
     */
    const handleFormSubmit = (e) => {
        e.preventDefault();

        const type = opTypeSelect.value;
        const ticker = document.getElementById('ticker').value.toUpperCase();
        const date = document.getElementById('date').value;

        if (!ticker || !date) {
            showMessage('Ticker e data são obrigatórios.', 'error', 'Erro de Validação');
            return;
        }

        if (type === 'Dividendo') {
            const value = parseFloat(document.getElementById('proventoValue').value);
            if (isNaN(value) || value <= 0) {
                 showMessage('Por favor, insira um valor válido para o provento.', 'error', 'Erro de Validação');
                 return;
            }
            proventos.push({ id: Date.now().toString(), ticker, date, type, value });
            showMessage('Provento registrado com sucesso!');

        } else { // Compra ou Venda
            const quantity = parseInt(document.getElementById('quantity').value);
            const price = parseFloat(document.getElementById('price').value);
            const brokerage = parseFloat(document.getElementById('brokerage').value || 0);
            const otherFees = parseFloat(document.getElementById('otherFees').value || 0);

            if (isNaN(quantity) || quantity <= 0 || isNaN(price) || price <= 0) {
                showMessage('Por favor, insira quantidade e preço válidos.', 'error', 'Erro de Validação');
                return;
            }
            operations.push({ id: Date.now().toString(), ticker, date, type, quantity, price, brokerage, otherFees });
            showMessage('Operação registrada com sucesso!');
        }
        
        saveDataToLocalStorage();
        updateAllQuotes().then(render); // Update quotes and re-render
        operationForm.reset();
        toggleFormFields(); // Reset form fields visibility
    };

    /**
     * Handles click events for delete buttons.
     * @param {Event} e - The click event.
     */
    const handleDeleteClick = (e) => {
        if (e.target.classList.contains('delete-btn')) {
            const id = e.target.dataset.id;
            const type = e.target.dataset.type;

            if (confirm('Tem certeza que deseja excluir este registro?')) {
                if (type === 'operation') {
                    operations = operations.filter(op => op.id !== id);
                } else if (type === 'provento') {
                    proventos = proventos.filter(prov => prov.id !== id);
                }
                saveDataToLocalStorage();
                updateAllQuotes().then(render); // Update quotes and re-render
                showMessage('Registro excluído com sucesso!');
            }
        }
    };
    
    /**
     * Toggles the visibility of form fields based on the selected operation type.
     */
    const toggleFormFields = () => {
        const type = opTypeSelect.value;
        if (type === 'Dividendo') {
            buySellFields.classList.add('hidden');
            dividendField.classList.remove('hidden');
            // Make buy/sell fields not required
            document.getElementById('quantity').required = false;
            document.getElementById('price').required = false;
            document.getElementById('proventoValue').required = true;
        } else {
            buySellFields.classList.remove('hidden');
            dividendField.classList.add('hidden');
            // Make buy/sell fields required
            document.getElementById('quantity').required = true;
            document.getElementById('price').required = true;
            document.getElementById('proventoValue').required = false;
        }
    };

    // Attach main event listeners
    operationForm.addEventListener('submit', handleFormSubmit);
    opTypeSelect.addEventListener('change', toggleFormFields);
    document.body.addEventListener('click', handleDeleteClick);


    // --- SIMULATED STOCK QUOTES ---

    /**
     * Simulates fetching a stock quote from an API.
     * @param {string} tickerSymbol - The ticker symbol (e.g., 'PETR4').
     * @returns {Promise<number>} A promise that resolves to a simulated price.
     */
    const fetchStockQuote = (tickerSymbol) => {
        return new Promise(resolve => {
            setTimeout(() => {
                // Simulate a price between 20 and 100 for demonstration
                const simulatedPrice = (Math.random() * 80) + 20;
                resolve(parseFloat(simulatedPrice.toFixed(2)));
            }, 300); // Simulate small network delay
        });
    };

    /**
     * Fetches quotes for all unique tickers in the portfolio.
     */
    const updateAllQuotes = async () => {
        const uniqueTickers = new Set(operations.map(op => op.ticker));
        const newQuotes = {};
        
        // Use Promise.all for concurrent fetching
        const quotePromises = Array.from(uniqueTickers).map(async (ticker) => {
            try {
                const price = await fetchStockQuote(ticker);
                newQuotes[ticker] = price;
            } catch (error) {
                console.error(`Erro ao buscar cotação para ${ticker}:`, error);
                newQuotes[ticker] = 'N/A';
            }
        });

        await Promise.all(quotePromises);
        currentQuotes = newQuotes;
    };


    // --- INITIALIZATION ---
    
    /**
     * Initializes the application.
     */
    const init = async () => {
        loadDataFromLocalStorage();
        toggleFormFields();
        await updateAllQuotes();
        render();

        // Refresh quotes every minute
        setInterval(async () => {
            await updateAllQuotes();
            render();
        }, 60000);
    };

    // Start the app!
    init();
});
