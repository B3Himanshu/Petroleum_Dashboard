# Business Intelligence Dashboard UI

A modern, responsive business intelligence dashboard built with React, TypeScript, and Tailwind CSS, featuring interactive data visualizations and comprehensive business metrics.

## 🚀 Features

- **Interactive Metric Cards**: Real-time KPI visualization with mini charts (line & bar)
- **Multiple Chart Types**: Line charts, bar charts, pie charts, and donut charts
- **Advanced Visualizations**: Monthly performance, sales summaries, and date-wise analytics
- **Responsive Design**: Mobile-friendly interface with modern UI components
- **Beautiful Animations**: Smooth transitions and slide-up animations
- **Status Cards**: Bank balance, fuel condition, and discount tracking
- **Quick Insights**: At-a-glance business performance indicators

## 📋 Tech Stack

- **React 18** - Modern React with hooks
- **TypeScript** - Type-safe development
- **Vite** - Lightning-fast build tool
- **Tailwind CSS** - Utility-first CSS framework
- **Shadcn/ui** - High-quality React components
- **Recharts** - Powerful charting library
- **Lucide Icons** - Beautiful icon set
- **React Router** - Client-side routing

## 🔧 Prerequisites

- **Node.js** (v18 or higher)
- **npm** (v9 or higher)

## 📦 Installation

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/ui-enhancement-studio.git
cd ui-enhancement-studio
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Start Development Server

```bash
npm run dev
```

The application will open at `http://localhost:8080`

## 📁 Project Structure

```
ui-enhancement-studio/
├── public/
│   ├── favicon.ico
│   ├── placeholder.svg
│   └── robots.txt
├── src/
│   ├── components/
│   │   ├── dashboard/
│   │   │   ├── BunkeredSalesChart.tsx
│   │   │   ├── DateWiseChart.tsx
│   │   │   ├── FilterSection.tsx
│   │   │   ├── Header.tsx
│   │   │   ├── MetricCard.tsx           # Enhanced with mini charts
│   │   │   ├── MonthlyPerformanceChart.tsx
│   │   │   ├── OrdersDonutChart.tsx
│   │   │   ├── PPIChart.tsx
│   │   │   ├── ProductSummaryChart.tsx
│   │   │   ├── QuickInsights.tsx
│   │   │   ├── SalesSummaryChart.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── StatusCard.tsx
│   │   ├── ui/                          # Shadcn UI components
│   │   └── NavLink.tsx
│   ├── hooks/
│   │   ├── use-mobile.tsx
│   │   └── use-toast.ts
│   ├── lib/
│   │   └── utils.ts
│   ├── pages/
│   │   ├── Index.tsx                    # Main dashboard page
│   │   └── NotFound.tsx
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── vite.config.ts
```

## 🎨 Key Features Breakdown

### Metric Cards with Mini Charts

The dashboard features 8 main KPI metric cards:

**Primary Metrics (Row 1):**
- **Total Fuel Volume** - Bar chart showing volume trends
- **Net Sales** - Line chart with growth indicators
- **Profit** - Line chart showing earnings progression
- **Avg PPI** - Bar chart displaying price per litre

**Secondary Metrics (Row 2):**
- **Actual PO** - Bar chart for purchase orders
- **Unique Cost Customers** - Line chart for customer trends
- **Basket Size** - Bar chart showing average order values
- **Customer Count** - Line chart tracking customer growth

### Status Cards

- Bank Closing Balance
- Fuel Condition Monitor
- Total Discounts Tracker

### Chart Visualizations

- **Monthly Performance Chart** - Combined line and area chart
- **Orders Donut Chart** - Order distribution by category
- **Bunkered Sales Chart** - Sales comparison visualization
- **PPI Chart** - Price per indication trends
- **Date-wise Chart** - Daily performance metrics

## 🎯 Available Scripts

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run linter
npm run lint
```

## 🎨 Customization

### Changing Brand Colors

Update colors in `tailwind.config.ts`:

```typescript
colors: {
  primary: "#80d5be",    // Light teal
  secondary: "#1d5a55",  // Dark teal
  // ... other colors
}
```

### Adding New Metric Cards

Use the `MetricCard` component in `src/pages/Index.tsx`:

```tsx
<MetricCard
  title="Your Metric"
  value="1,234"
  subtitle="Description"
  icon={YourIcon}
  iconBg="blue"
  delay={0}
  chartType="line"          // "line", "bar", or "none"
  chartData={[10, 20, 30]}  // Array of values
/>
```

### Chart Types Supported

- **Line Charts**: `chartType="line"` - Smooth trend lines
- **Bar Charts**: `chartType="bar"` - Vertical bars with rounded tops
- **No Chart**: `chartType="none"` - Metric card only

## 🌈 Design System

### Color Palette

- **Blue**: `#3b82f6` - Primary actions, info
- **Green**: `#10b981` - Success, growth
- **Yellow**: `#f59e0b` - Warning, attention
- **Orange**: `#f97316` - Important metrics
- **Purple**: `#8b5cf6` - Premium features
- **Pink**: `#ec4899` - Special highlights

### Typography

- **Headings**: Font-bold, 2xl-4xl sizes
- **Body**: Font-medium, sm-base sizes
- **Captions**: Font-normal, xs-sm sizes

### Spacing

- Cards: `gap-5` or `gap-6`
- Padding: `p-6` for main containers
- Margins: `mb-4` to `mb-6` between sections

## 📱 Responsive Breakpoints

- **Mobile**: < 768px
- **Tablet**: 768px - 1024px
- **Desktop**: > 1024px

Grid system automatically adjusts:
- Mobile: 1 column
- Tablet: 2 columns
- Desktop: 4 columns (metrics), 2-3 columns (charts)

## 🚀 Performance Optimization

- Component lazy loading with React Router
- Optimized Recharts rendering
- Tailwind CSS purging for minimal bundle size
- Vite's fast HMR for development
- Animation delays for staggered loading

## 🎭 Animation System

Cards animate on load with staggered timing:

```tsx
delay={0}    // First card: immediate
delay={50}   // Second card: 50ms delay
delay={100}  // Third card: 100ms delay
// ... and so on
```

## 📊 Sample Data

All charts use mock data for demonstration. To integrate real data:

1. Create a data service in `src/services/`
2. Use React Query or SWR for data fetching
3. Pass data as props to components
4. Update chart data arrays with API responses

## 🔮 Future Enhancements

- [ ] Real-time data integration
- [ ] Data export functionality
- [ ] Advanced filtering options
- [ ] Custom date range selector
- [ ] Drill-down analytics
- [ ] Print/PDF export
- [ ] Dashboard customization
- [ ] Dark/Light theme toggle
- [ ] Multi-dashboard support

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📝 License

This project is licensed under the MIT License.

## 👨‍💻 Author

Built with ❤️ using React, TypeScript, and Tailwind CSS

## 📞 Support

For questions or support, please open an issue in the repository.

---

**Ready to visualize your business metrics! 📈**
