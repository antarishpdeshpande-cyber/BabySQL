import React, { useState } from 'react';
import {
  BookOpen,
  X,
  HelpCircle,
  TrendingUp,
  CheckCircle2,
  GitFork,
  BarChart2,
  ChevronRight,
  ShieldCheck,
  Zap,
} from 'lucide-react';

interface StatisticalGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTest?: (testType: string) => void;
}

interface GuideItem {
  id: string;
  name: string;
  category: string;
  question: string;
  useWhen: string[];
  businessExample: string;
  dataRequirements: string;
  assumptions: string[];
  howToInterpret: string[];
}

const GUIDE_ITEMS: GuideItem[] = [
  {
    id: 'welch_ttest',
    name: "Two-Sample Welch's t-Test (A/B Testing)",
    category: 'Comparing Means',
    question: 'Did Variant B generate higher revenue or conversions than Variant A?',
    useWhen: [
      'Comparing the average of a continuous metric between two independent cohorts.',
      'Analyzing digital marketing A/B tests, new feature rollouts, or pricing experiments.',
      'Welch’s variant is superior to Student’s t-test because it does NOT assume equal group variances.',
    ],
    businessExample:
      'Testing if users who saw a redesigned checkout page (Variant B) spent statistically significantly more ($) than users on the original page (Variant A).',
    dataRequirements:
      '1 Numeric Metric column (continuous) + 1 Categorical Grouping column with exactly 2 values.',
    assumptions: [
      'Independent observations (users in A are distinct from B).',
      'Continuous metric scale (revenue, session duration, order value).',
      'Robust to moderate non-normality when n ≥ 30 per cohort.',
    ],
    howToInterpret: [
      'p < 0.05: Reject H₀. The two cohorts have a statistically significant difference.',
      'p ≥ 0.05: Fail to reject H₀. Any observed difference could easily be random noise.',
      'Cohen’s d: Measures magnitude (<0.2 negligible, 0.5 medium, >0.8 large business impact).',
    ],
  },
  {
    id: 'one_sample_ttest',
    name: 'One-Sample t-Test (Benchmark Comparison)',
    category: 'Comparing Means',
    question: 'Does our team or product reach the company KPI benchmark?',
    useWhen: [
      'Comparing an observed sample average against an established historical standard or target.',
      'Evaluating SLA compliance, CSAT target achievement, or delivery speed baselines.',
    ],
    businessExample:
      'Evaluating whether the customer support team’s average resolution time (41.2 hours) is significantly lower than the company SLA benchmark of 48 hours.',
    dataRequirements: '1 Numeric Metric column + 1 Hypothesized constant benchmark value (μ₀).',
    assumptions: [
      'Data is randomly sampled from the target population.',
      'Sample size n ≥ 20 for reliable estimation.',
    ],
    howToInterpret: [
      'p < 0.05: The sample mean reliably differs from the benchmark target.',
      'Confidence Interval: The 95% range where the true population average lies.',
    ],
  },
  {
    id: 'paired_ttest',
    name: 'Paired Samples t-Test (Before vs After)',
    category: 'Comparing Means',
    question: 'Did the training or product update improve scores for the same subjects?',
    useWhen: [
      'Testing differences across two paired measurements on the exact same group of customers or employees.',
      'Pre-intervention vs Post-intervention testing.',
    ],
    businessExample:
      'Measuring sales rep performance scores before and after completing an executive negotiation workshop.',
    dataRequirements: '2 Numeric Columns representing measurement Time 1 and Time 2.',
    assumptions: [
      'Each row represents paired observations from the same subject.',
      'Differences between pairs should be approximately normally distributed.',
    ],
    howToInterpret: [
      'p < 0.05: Statistically significant change between the two timeframes.',
      'Mean Difference: Average magnitude of improvement or drop.',
    ],
  },
  {
    id: 'one_way_anova',
    name: 'One-Way ANOVA (F-Test)',
    category: 'Comparing Means',
    question: 'Does performance differ across our 4 regional branches or 5 marketing channels?',
    useWhen: [
      'Comparing average performance across 3 or more categorical groups.',
      'Avoids the inflated false-positive risk of running multiple individual t-tests.',
    ],
    businessExample:
      'Determining if average quarterly sales per store differ across North, South, East, and West territories.',
    dataRequirements: '1 Numeric Metric column + 1 Categorical Grouping column with 3+ distinct categories.',
    assumptions: [
      'Independent random samples across all groups.',
      'Approximately normal distributions within each segment.',
    ],
    howToInterpret: [
      'p < 0.05: At least one group mean is statistically different from the others.',
      'Eta-Squared (η²): Percentage of total variance explained by the grouping factor.',
    ],
  },
  {
    id: 'chi_square',
    name: 'Chi-Square Test of Independence (χ²)',
    category: 'Categorical Association',
    question: 'Is customer churn dependent on payment method or contract type?',
    useWhen: [
      'Evaluating whether two categorical attributes are statistically associated or completely independent.',
      'Analyzing survey responses, demographic splits, and conversion by device.',
    ],
    businessExample:
      'Determining whether customer churn (Yes vs No) is significantly associated with payment method (Credit Card vs UPI vs Cash).',
    dataRequirements: '2 Categorical/Text Columns (e.g. Subscription Plan & Churn Status).',
    assumptions: [
      'Each subject contributes to exactly one cell in the contingency table.',
      "Cochran's condition: Expected cell count should ideally be ≥ 5 for at least 80% of cells.",
    ],
    howToInterpret: [
      'p < 0.05: The two dimensions are significantly dependent / associated.',
      "Cramér’s V: Association strength (0 = no association, 0.3 = moderate, > 0.5 = strong).",
    ],
  },
  {
    id: 'correlation',
    name: 'Pearson Correlation Test',
    category: 'Relationships & Prediction',
    question: 'Do sales increase as customer review scores increase?',
    useWhen: [
      'Measuring the strength and direction (-1 to +1) of a linear relationship between two continuous metrics.',
      'Exploratory data analysis prior to regression modeling.',
    ],
    businessExample:
      'Checking if the discount percentage offered has a positive, negative, or neutral correlation with total customer basket value.',
    dataRequirements: '2 Numeric Continuous Columns (X and Y).',
    assumptions: ['Linear relationship between the two variables.', 'Absence of extreme outliers.'],
    howToInterpret: [
      'r > 0: Positive relationship (both metrics rise together).',
      'r < 0: Inverse/negative relationship (as X rises, Y drops).',
      'p < 0.05: The correlation is statistically distinguishable from zero.',
    ],
  },
  {
    id: 'linear_regression',
    name: 'Ordinary Least Squares (OLS) Linear Regression',
    category: 'Relationships & Prediction',
    question: 'How many dollars in sales do we gain for every additional $1 spent on Google Ads?',
    useWhen: [
      'Quantifying cause-and-effect impact and predicting outcome variable Y from predictor X.',
      'Forecasting revenue, churn risk, or customer lifetime value.',
    ],
    businessExample:
      'Estimating quarterly sales revenue (Y) as a function of marketing ad spend (X): Revenue = $12,400 + 3.82 × AdSpend.',
    dataRequirements: '1 Continuous Dependent Outcome (Y) + 1 Continuous Independent Predictor (X).',
    assumptions: ['Linear relationship between X and Y.', 'Independent residuals.', 'Homoscedasticity.'],
    howToInterpret: [
      'Slope (β₁): The estimated change in Y for a 1-unit increase in X.',
      'R-Squared (R²): The proportion of total variation in Y explained by the model.',
      'Model p-value < 0.05: The predictive relationship is statistically reliable.',
    ],
  },
  {
    id: 'mann_whitney',
    name: 'Mann-Whitney U Test (Wilcoxon Rank-Sum)',
    category: 'Non-Parametric',
    question: 'How do we compare cohorts when data is heavily skewed or has extreme outliers?',
    useWhen: [
      'Comparing two groups when the metric does NOT follow a normal distribution (e.g. viral views, revenue with whales, or small samples).',
      'Non-parametric alternative to Welch’s t-test that evaluates ranks rather than raw means.',
    ],
    businessExample:
      'Comparing user engagement time between two mobile onboarding variants when 90% of users spend 30 seconds and a few spend 5 hours (heavily right-skewed).',
    dataRequirements: '1 Numeric Metric Column + 1 Categorical Grouping Column with 2 groups.',
    assumptions: ['Independent groups.', 'Ordinal or continuous data.'],
    howToInterpret: [
      'p < 0.05: The distributions of the two groups are statistically significantly different.',
      'Evaluates medians and rank distribution rather than easily-distorted means.',
    ],
  },
];

export const StatisticalGuideModal: React.FC<StatisticalGuideModalProps> = ({
  isOpen,
  onClose,
  onSelectTest,
}) => {
  const [selectedItem, setSelectedItem] = useState<GuideItem>(GUIDE_ITEMS[0]);
  const [searchFilter, setSearchFilter] = useState<string>('');

  if (!isOpen) return null;

  const filteredItems = GUIDE_ITEMS.filter(
    (item) =>
      item.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      item.category.toLowerCase().includes(searchFilter.toLowerCase()) ||
      item.question.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-surface border border-border rounded-xl w-full max-w-4xl h-[85vh] shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-surface-raised/40">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-100">
                Statistical Tests Reference & Decision Guide
              </h3>
              <p className="text-[11px] text-muted">
                Executive handbook: choosing the right test, business interpretation, and mathematical models
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-muted hover:text-slate-200 hover:bg-surface-raised transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body: Left Sidebar + Right Detail View */}
        <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
          {/* Left Column: Test Directory */}
          <div className="w-full md:w-80 border-b md:border-b-0 md:border-r border-border bg-surface flex flex-col">
            <div className="p-3 border-b border-border">
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Search tests or business use cases..."
                className="w-full bg-background border border-border rounded px-2.5 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-primary"
              />
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {filteredItems.map((item) => {
                const isSelected = selectedItem.id === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setSelectedItem(item)}
                    className={`w-full text-left p-2.5 rounded-lg text-xs transition-all flex flex-col gap-0.5 ${
                      isSelected
                        ? 'bg-primary/20 border border-primary/40 text-cyan-300'
                        : 'hover:bg-surface-raised/50 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-[11px] text-slate-200 truncate">{item.name}</span>
                      <span className="text-[9px] font-mono uppercase px-1 rounded bg-surface border border-border text-muted">
                        {item.category}
                      </span>
                    </div>
                    <span className="text-[10px] text-muted truncate">{item.question}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column: Detailed Guide */}
          <div className="flex-1 p-5 overflow-y-auto space-y-5 bg-background text-xs">
            <div>
              <div className="flex items-center gap-2 text-[10px] font-mono uppercase text-cyan-400">
                <span>{selectedItem.category}</span>
                <span>•</span>
                <span>Hypothesis Model</span>
              </div>
              <h2 className="text-base font-bold text-slate-100 mt-0.5">{selectedItem.name}</h2>
              <div className="p-3 mt-2.5 rounded-lg bg-surface border border-border flex items-start gap-2.5">
                <HelpCircle className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <div>
                  <div className="text-[10px] uppercase font-semibold text-muted">Primary Business Question</div>
                  <div className="text-xs font-medium text-slate-200 italic mt-0.5">
                    "{selectedItem.question}"
                  </div>
                </div>
              </div>
            </div>

            {/* When to Use */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2 flex items-center gap-1.5">
                <GitFork className="w-3.5 h-3.5 text-primary" />
                <span>When to Choose This Test</span>
              </h4>
              <ul className="space-y-1.5 text-slate-300">
                {selectedItem.useWhen.map((uw, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-cyan-400 mt-0.5">•</span>
                    <span>{uw}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Real World Business Scenario */}
            <div className="p-3.5 rounded-lg bg-emerald-950/20 border border-emerald-500/30">
              <div className="text-[10px] uppercase font-semibold text-emerald-400 flex items-center gap-1.5 mb-1">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Corporate / Practical Business Scenario</span>
              </div>
              <p className="text-xs text-slate-200 leading-relaxed font-normal">
                {selectedItem.businessExample}
              </p>
            </div>

            {/* Data Requirements & Assumptions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3.5 rounded-lg bg-surface border border-border">
                <div className="text-[10px] uppercase font-semibold text-muted flex items-center gap-1.5 mb-1.5">
                  <BarChart2 className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Data Requirements</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  {selectedItem.dataRequirements}
                </p>
              </div>

              <div className="p-3.5 rounded-lg bg-surface border border-border">
                <div className="text-[10px] uppercase font-semibold text-muted flex items-center gap-1.5 mb-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Key Assumptions</span>
                </div>
                <ul className="space-y-1 text-[11px] text-slate-300">
                  {selectedItem.assumptions.map((asm, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <span className="text-slate-500">✓</span>
                      <span>{asm}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* How to Interpret Outputs */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Interpreting Output Results for Decision Making</span>
              </h4>
              <div className="p-3.5 rounded-lg bg-surface border border-border space-y-2">
                {selectedItem.howToInterpret.map((interp, i) => (
                  <div key={i} className="flex items-start gap-2 text-slate-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1.5 shrink-0" />
                    <span>{interp}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-border bg-surface-raised/20 flex items-center justify-between">
          <span className="text-[11px] text-muted font-mono">BabySQL Statistical Decision Framework</span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded border border-border hover:bg-surface-raised text-xs text-slate-300"
            >
              Close Guide
            </button>
            {onSelectTest && (
              <button
                onClick={() => {
                  onSelectTest(selectedItem.id);
                  onClose();
                }}
                className="px-3.5 py-1.5 rounded bg-primary hover:bg-primary-hover active:scale-[0.98] text-slate-900 font-semibold text-xs flex items-center gap-1.5"
              >
                <span>Select & Configure {selectedItem.name.split('(')[0]}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
