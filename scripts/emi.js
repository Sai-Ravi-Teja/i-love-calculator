import { getCssVariable, toCurrency } from './main.js';

export const emiCalculator = {
    // Elements storage
    elements: {},
    chart: null,
    timer: null,

    // 1. Grab all necessary HTML elements
    getElements: function() {
        // ... (rest of getElements remains the same) ...
        this.elements = {
            amountInput: document.getElementById('amount-input'),
            amountSlider: document.getElementById('amount-slider'),
            rateInput: document.getElementById('rate-input'),
            rateSlider: document.getElementById('rate-slider'),
            yearsInput: document.getElementById('tenure-years'),
            monthsInput: document.getElementById('tenure-months'),
            warningMsg: document.getElementById('tenure-warning'),
            emiAmount: document.getElementById('emi-amount'),
            totalInterest: document.getElementById('total-interest'),
            totalPayment: document.getElementById('total-payment'),
            ctx: document.getElementById('emiChart').getContext('2d'),
            // Download Buttons
            btnPdf: document.getElementById('btn-pdf'),
            btnExcel: document.getElementById('btn-excel'),
            btnTxt: document.getElementById('btn-txt')
        };
    },

    // 2. Initialize the Chart.js Graph (No change needed)
    initChart: function() {
        const principalColor = getCssVariable('--chart-principal-color');
        const interestColor = getCssVariable('--chart-interest-color');

        if (this.chart) this.chart.destroy(); // Destroy existing chart if re-initializing

        this.chart = new Chart(this.elements.ctx, {
            // ... (rest of initChart remains the same) ...
            type: 'doughnut',
            data: {
                labels: ['Principal', 'Interest'],
                datasets: [{
                    data: [100, 50],
                    backgroundColor: [principalColor, interestColor],
                    borderWidth: 0
                }]
            },
            options: {
                cutout: '75%', responsive: true, maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function(tooltipItem) {
                                const label = tooltipItem.label || '';
                                const value = tooltipItem.parsed;
                                const total = tooltipItem.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((value / total) * 100).toFixed(1);
                                return `${label}: ${toCurrency(value)} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    },

    // 3. Update Slider Visual Fill (No change needed)
    updateSliderFill: function(slider) {
        const min = parseFloat(slider.min) || 0;
        const max = parseFloat(slider.max) || 100;
        const value = parseFloat(slider.value) || min;
        const percentage = ((value - min) / (max - min)) * 100;
        slider.style.setProperty('--slider-fill', `${percentage}%`);
    },

    // 4. Validate Tenure Logic (No change needed)
    validateTenure: function() {
        let m = parseInt(this.elements.monthsInput.value) || 0;
        let y = parseInt(this.elements.yearsInput.value) || 0;
        
        clearTimeout(this.timer);
        this.elements.warningMsg.style.display = 'none';

        if (m === 12) {
            this.elements.yearsInput.value = y + 1;
            this.elements.monthsInput.value = 0;
        } else if (m > 12) {
            this.elements.monthsInput.value = 11;
            this.elements.warningMsg.style.display = 'block';
            this.timer = setTimeout(() => {
                this.elements.warningMsg.style.display = 'none';
            }, 3000);
        }
        if (y < 0) this.elements.yearsInput.value = 0;
        this.calculate();
    },

    // 5. Main Calculation Logic (No change needed)
    calculate: function() {
        let P = parseFloat(this.elements.amountInput.value);
        let r = parseFloat(this.elements.rateInput.value) / 12 / 100;
        let years = parseInt(this.elements.yearsInput.value) || 0;
        let months = parseInt(this.elements.monthsInput.value) || 0;
        let n = (years * 12) + months;

        if (n <= 0 || P <= 0) return;

        let emi = (r === 0) ? P / n : P * r * (Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
        let totalPay = emi * n;
        let totalInt = totalPay - P;

        this.elements.emiAmount.innerText = toCurrency(emi);
        this.elements.totalInterest.innerText = toCurrency(totalInt);
        this.elements.totalPayment.innerText = toCurrency(totalPay);

        if (this.chart) {
            this.chart.data.datasets[0].data = [P, totalInt];
            this.chart.update();
        }

        return { P, r, n, emi, totalInt, totalPay };
    },

    // 6. Generate Schedule for Downloads (No change needed)
    getSchedule: function() {
        const data = this.calculate();
        if(!data) return [];
        let balance = data.P;
        let schedule = [];

        for (let i = 1; i <= data.n; i++) {
            let interestPart = balance * data.r;
            let principalPart = data.emi - interestPart;
            if(i === data.n) {
                principalPart = balance;
                data.emi = principalPart + interestPart;
                balance = 0;
            } else { balance -= principalPart; }
            schedule.push({ month: i, emi: data.emi, principal: principalPart, interest: interestPart, balance: balance < 0 ? 0 : balance });
        }
        return schedule;
    },

    // 7. Download PDF (No change needed)
    downloadPDF: function() {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const info = this.calculate();
        if (!info) return;
        const schedule = this.getSchedule();

        doc.setFontSize(18); doc.setTextColor(79, 70, 229); doc.text("EMI Report", 14, 20);
        doc.setFontSize(10); doc.setTextColor(0, 0, 0);
        doc.text(`Loan Amount: ${toCurrency(info.P)}`, 14, 30);
        doc.text(`Interest Rate: ${this.elements.rateInput.value}%`, 14, 36);
        doc.text(`Tenure: ${this.elements.yearsInput.value} Years ${this.elements.monthsInput.value} Months`, 14, 42);
        doc.text(`Monthly EMI: ${toCurrency(info.emi)}`, 14, 48);

        const tableBody = schedule.map(row => [ row.month, Math.round(row.emi), Math.round(row.principal), Math.round(row.interest), Math.round(row.balance) ]);
        doc.autoTable({ startY: 60, head: [['Month', 'EMI', 'Principal', 'Interest', 'Balance']], body: tableBody, theme: 'grid' });
        doc.save('emi-report.pdf');
    },

    // 8. Download Excel (CSV) (No change needed)
    downloadExcel: function() {
        const info = this.calculate();
        if (!info) return;
        const schedule = this.getSchedule();
        
        let csvContent = "data:text/csv;charset=utf-8,";
        csvContent += `EMI REPORT DETAILS\n`;
        csvContent += `Loan Amount,${info.P}\n`;
        csvContent += `Interest Rate,${this.elements.rateInput.value}%\n`;
        csvContent += `Tenure,${this.elements.yearsInput.value} Years ${this.elements.monthsInput.value} Months\n`;
        csvContent += `Monthly EMI,${info.emi.toFixed(2)}\n`;
        csvContent += `Total Interest,${info.totalInt.toFixed(2)}\n\n`;
        csvContent += "Month,Monthly EMI,Principal Component,Interest Component,Outstanding Balance\n";

        schedule.forEach(row => {
            let rowString = `${row.month},${row.emi.toFixed(2)},${row.principal.toFixed(2)},${row.interest.toFixed(2)},${row.balance.toFixed(2)}`;
            csvContent += rowString + "\n";
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "emi_schedule.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    },

    // 9. Download Text (.txt) (No change needed)
    downloadText: function() {
        const info = this.calculate();
        if (!info) return;
        const schedule = this.getSchedule();
        let txt = `EMI CALCULATOR REPORT\n=====================\n`;
        txt += `Loan Amount   : ${toCurrency(info.P)}\n`;
        txt += `Interest Rate : ${this.elements.rateInput.value}%\n`;
        txt += `Total Tenure  : ${this.elements.yearsInput.value} Years, ${this.elements.monthsInput.value} Months\n`;
        txt += `Monthly EMI   : ${toCurrency(info.emi)}\n`;
        txt += `Total Payment : ${toCurrency(info.totalPay)}\n`;
        txt += `Total Interest: ${toCurrency(info.totalInt)}\n\n`;
        
        txt += `Month | EMI       | Principal | Interest  | Outstanding\n`;
        txt += `------|-----------|-----------|-----------|------------\n`;
        
        schedule.forEach(row => {
            txt += `${row.month.toString().padEnd(5)} | ${Math.round(row.emi).toString().padEnd(9)} | ${Math.round(row.principal).toString().padEnd(9)} | ${Math.round(row.interest).toString().padEnd(9)} | ${Math.round(row.balance)}\n`;
        });

        const blob = new Blob([txt], { type: 'text/plain' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'emi-report.txt';
        link.click();
    },

    // 10. Setup Listeners (No change needed)
    setupListeners: function() {
        const sync = (slider, input) => {
            this.updateSliderFill(slider);
            slider.addEventListener('input', () => { input.value = slider.value; this.updateSliderFill(slider); this.calculate(); });
            input.addEventListener('input', () => { slider.value = input.value; this.updateSliderFill(slider); this.calculate(); });
        };

        sync(this.elements.amountSlider, this.elements.amountInput);
        sync(this.elements.rateSlider, this.elements.rateInput);
        this.elements.yearsInput.addEventListener('input', () => this.calculate());
        this.elements.monthsInput.addEventListener('input', () => this.validateTenure());

        // Download Buttons - These are now only attached once by main.js
        this.elements.btnPdf.addEventListener('click', () => this.downloadPDF());
        this.elements.btnExcel.addEventListener('click', () => this.downloadExcel());
        this.elements.btnTxt.addEventListener('click', () => this.downloadText());
    }
};

export function initEMI() {
    emiCalculator.getElements();
    emiCalculator.initChart();
    emiCalculator.setupListeners();
    emiCalculator.calculate();
}