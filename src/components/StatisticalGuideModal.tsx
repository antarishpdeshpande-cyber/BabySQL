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
  Network,
  Binary,
  Layers,
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
    question: 'Did Variant B generate higher revenue or order value than Variant A?',
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
    id: 'proportion_ztest',
    name: 'Two-Sample Z-Test of Proportions (Conversion A/B)',
    category: 'Categorical & Proportions',
    question: 'Did new UI design achieve a higher conversion rate than the baseline control?',
    useWhen: [
      'Comparing conversion rates, click-through rates, churn rates, or binary success rates between two groups.',
      'The foundational standard for digital product experimentation and growth marketing.',
    ],
    businessExample:
      'Testing whether the new signup funnel increased user conversion from 8.2% (Control) to 11.4% (Variant).',
    dataRequirements: '1 Binary outcome column (1/0, true/false, yes/no) + 1 Categorical cohort column (A vs B).',
    assumptions: [
      'Independent Bernoulli trials across cohorts.',
      'Success-failure condition: at least 5 successes and 5 failures per cohort.',
    ],
    howToInterpret: [
      'p < 0.05: Statistically significant difference in conversion rates between variants.',
      'Relative Lift (%): Percentage improvement over base variant.',
      '95% CI of Difference: Range of absolute percentage difference in the real population.',
    ],
  },
  {
    id: 'one_sample_ttest',
    name: 'One-Sample t-Test (Benchmark Comparison)',
    category: 'Comparing Means',
    question: 'Does our team or product reach the company KPI benchmark target?',
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
    name: 'One-Way ANOVA (Multi-Group Comparison)',
    category: 'Comparing Means',
    question: 'Does customer spending differ significantly across our 4 regional territories?',
    useWhen: [
      'Comparing average performance across 3 or more independent categorical groups.',
      'Avoiding the inflated false-positive risk of running multiple two-sample t-tests.',
    ],
    businessExample:
      'Comparing average monthly revenue across Enterprise, Mid-Market, SMB, and Startup customer tiers.',
    dataRequirements: '1 Numeric Metric column + 1 Categorical Grouping column with 3+ distinct values.',
    assumptions: [
      'Independent observations between groups.',
      'Continuous metric scale.',
      'Approximately normal distributions within each group.',
    ],
    howToInterpret: [
      'p < 0.05: At least one group differs significantly from the others.',
      'F-statistic: Ratio of between-group variance to within-group natural variation.',
      'Eta-squared (η²): Percentage of total variance explained by group membership.',
      'Tukey HSD Post-Hoc: Pairwise Studentized range tests (q) pinpoint which group pairs drive significance.',
    ],
  },
  {
    id: 'cronbach_alpha',
    name: "Cronbach's Alpha (Survey Scale Reliability)",
    category: 'Predictive & Multivariate',
    question: 'Do the questions in our 5-point CSAT, NPS, or engagement survey measure a coherent underlying construct?',
    useWhen: [
      'Validating multi-item Likert rating scales, psychological instruments, or composite survey indices.',
      'Checking if items share sufficient true variance before averaging them into a composite KPI.',
      'Identifying redundant, conflicting, or reverse-coded survey questions using Item-Total statistics.',
    ],
    businessExample:
      'Evaluating internal consistency of a 6-question employee satisfaction questionnaire (Scale α ≥ 0.80).',
    dataRequirements: '2 or more numeric Likert/survey rating columns (respondents as rows).',
    assumptions: [
      'Unidimensionality: Items tap into the same underlying conceptual construct.',
      'Tau-equivalence: All items measure the true score with equal precision.',
      'Continuous or interval-approximated Likert response format (e.g. 1 to 5).',
    ],
    howToInterpret: [
      'α ≥ 0.90: Excellent internal consistency (High-stakes / clinical grade).',
      'α = 0.80 - 0.89: Good reliability (Industry gold-standard for survey research).',
      'α = 0.70 - 0.79: Acceptable reliability for exploratory analysis.',
      'Alpha if Item Deleted: If removing an item increases overall α, that question weakens the scale.',
      'Corrected Item-Total r < 0.2: Item has poor correlation with the rest of the survey scale.',
    ],
  },
  {
    id: 'multiple_regression',
    name: 'Multiple Linear Regression (Multivariate OLS)',
    category: 'Predictive & Multivariate',
    question: 'How do age, cycle count, and charging habits jointly impact battery health or revenue?',
    useWhen: [
      'Modeling continuous outcome Y from multiple independent predictors (X₁, X₂, ...).',
      'Controlling for confounding variables in business decisions (e.g. pricing, salary, marketing mix).',
      'Evaluating relative feature importance and multicollinearity via Variance Inflation Factors (VIF).',
    ],
    businessExample:
      'Predicting employee salary from years of experience + performance score + education level.',
    dataRequirements: '1 Continuous Target Column (Y) + 2 or more Numeric Predictors (X).',
    assumptions: [
      'Linear relationship between Y and predictors.',
      'No extreme multicollinearity (VIF < 5 for all predictors).',
      'Homoscedasticity of residuals.',
    ],
    howToInterpret: [
      'Model F-stat & p < 0.05: The combined set of predictors explains significant variance in Y.',
      'Adjusted R²: Proportion of variance explained, penalized for model complexity.',
      'Coefficients (β): Change in Y for a 1-unit increase in X, holding all other variables constant.',
      'VIF > 5: Warning indicator that two predictors are redundant/collinear.',
    ],
  },
  {
    id: 'logistic_regression',
    name: 'Binary Logistic Regression (Logit Classification)',
    category: 'Predictive & Multivariate',
    question: 'What factors drive customer churn, loan default, or battery hardware failure?',
    useWhen: [
      'Predicting binary outcomes (Y ∈ {0, 1}) from continuous and categorical predictors.',
      'Calculating Odds Ratios (e^β) for business risk factors.',
      'Evaluating classification precision, recall, accuracy, and confusion matrix.',
    ],
    businessExample:
      'Predicting whether an EV battery will experience failure (0/1) based on cell temperature, internal resistance, and age.',
    dataRequirements: '1 Binary Target column (0 or 1) + 1 or more Numeric Predictors (X).',
    assumptions: [
      'Binary target outcome.',
      'Independence of observations.',
      'Linearity in the log-odds of the outcome.',
    ],
    howToInterpret: [
      'Odds Ratio > 1.0: Predictor increases the odds of failure/success.',
      'Odds Ratio < 1.0: Predictor acts as a protective factor.',
      'McFadden’s Pseudo-R²: 0.2 to 0.4 represents an excellent model fit in practice.',
      'Confusion Matrix: Evaluates False Positives vs False Negatives at 0.5 decision threshold.',
    ],
  },
  {
    id: 'linear_regression',
    name: 'Simple Linear Regression (Single X)',
    category: 'Predictive & Multivariate',
    question: 'How much revenue do we gain for every additional $1 spent on Google Ads?',
    useWhen: [
      'Quantifying the direct linear sensitivity of outcome Y to a single driver variable X.',
      'Forecasting continuous metrics with a calibrated slope and intercept formula.',
    ],
    businessExample:
      'Predicting delivery time (days) based strictly on distance traveled (km).',
    dataRequirements: '1 Continuous Target column (Y) + 1 Continuous Predictor column (X).',
    assumptions: ['Linear relationship between variables.', 'Normal distribution of residuals.'],
    howToInterpret: [
      'Slope (β₁): The exact unit change in Y per unit increase in X.',
      'R²: Percentage of variance in Y explained by X.',
      'p < 0.05: Confirms the slope is statistically distinct from zero.',
    ],
  },
  {
    id: 'correlation',
    name: 'Pearson Correlation Test (Linear Association)',
    category: 'Predictive & Multivariate',
    question: 'Does employee experience correlate with higher sales performance?',
    useWhen: [
      'Testing whether two continuous metrics move together in a linear pattern.',
      'Evaluating scale-free association strength bounded between -1.0 and +1.0.',
    ],
    businessExample:
      'Analyzing whether customer satisfaction scores correlate with repeat purchase frequency.',
    dataRequirements: '2 Continuous Numeric columns.',
    assumptions: ['Bivariate normal distribution.', 'Linear relationship without severe outliers.'],
    howToInterpret: [
      'r > 0.7: Strong positive correlation.',
      'r < -0.7: Strong negative correlation.',
      'p < 0.05: The correlation is statistically significant and not random noise.',
    ],
  },
  {
    id: 'mann_whitney',
    name: 'Mann-Whitney U Test (Wilcoxon Rank-Sum)',
    category: 'Non-Parametric',
    question: 'Do cohorts differ when revenue data is heavily skewed with extreme outliers?',
    useWhen: [
      'Comparing two independent cohorts when the continuous metric is highly skewed or non-normal.',
      'Analyzing order values or session durations with 100x power-law outliers.',
    ],
    businessExample:
      'Comparing transaction spend across two marketing channels where top 1% customers skew the arithmetic mean.',
    dataRequirements: '1 Numeric / Ordinal column + 1 Categorical Grouping column (2 groups).',
    assumptions: ['Independent observations.', 'Distribution shapes are roughly similar across groups.'],
    howToInterpret: [
      'p < 0.05: Statistically significant difference in rank distribution and medians.',
      'Compares medians rather than means, providing extreme resistance to outliers.',
    ],
  },
  {
    id: 'kruskal_wallis',
    name: 'Kruskal-Wallis H-Test (Non-Parametric ANOVA)',
    category: 'Non-Parametric',
    question: 'Do customer CSAT ratings differ across 4 departments without assuming normality?',
    useWhen: [
      'Comparing 3 or more groups when ANOVA normality or equal variance assumptions are violated.',
      'Analyzing ordinal Likert scales (1–5 ratings) or skewed business distributions.',
    ],
    businessExample:
      'Testing customer satisfaction ratings across 4 regional branches on a 1–5 star scale.',
    dataRequirements: '1 Numeric / Ordinal column + 1 Categorical Grouping column (3+ groups).',
    assumptions: ['Independent random samples.', 'Ordinal or continuous scale.'],
    howToInterpret: [
      'p < 0.05: At least one cohort has a statistically different rank distribution.',
      'Epsilon-squared (ε²): Proportion of rank variance shared with grouping variable.',
    ],
  },
  {
    id: 'wilcoxon_signed_rank',
    name: 'Wilcoxon Signed-Rank Test (Non-Parametric Paired)',
    category: 'Non-Parametric',
    question: 'Did employee NPS ratings improve before vs after training on a skewed scale?',
    useWhen: [
      'Comparing paired repeated measures when differences are not normally distributed.',
      'Analyzing paired Before/After CSAT ratings or non-normal paired financial metrics.',
    ],
    businessExample:
      'Comparing employee satisfaction ratings (1–10) before and after introducing flexible remote work.',
    dataRequirements: '2 Numeric / Ordinal columns representing paired Before and After.',
    assumptions: ['Paired observations from same subjects.', 'Differences are symmetric.'],
    howToInterpret: [
      'p < 0.05: Statistically significant median difference between paired timepoints.',
      'W-statistic: Sum of signed ranks for positive vs negative differences.',
    ],
  },
  {
    id: 'spearman_correlation',
    name: "Spearman's Rank Correlation Test (Monotonic)",
    category: 'Non-Parametric',
    question: 'Do customer review ratings associate with revenue in a non-linear curve?',
    useWhen: [
      'Testing monotonic associations between variables without requiring strict linear proportionality.',
      'Immune to extreme outliers and applicable to ordinal ranks.',
    ],
    businessExample:
      'Evaluating the relationship between hotel star rating (1–5) and booking price.',
    dataRequirements: '2 Numeric / Ordinal columns.',
    assumptions: ['Paired observations.', 'Monotonic relationship.'],
    howToInterpret: [
      'Spearman ρ: Measures monotonic consistency (-1 to +1).',
      'p < 0.05: Statistically significant monotonic relationship.',
    ],
  },
  {
    id: 'chi_square',
    name: 'Chi-Square Test of Independence (χ²)',
    category: 'Categorical & Proportions',
    question: 'Is customer churn dependent on payment method or contract tier?',
    useWhen: [
      'Testing for an association between two categorical variables.',
      'Cross-tabulating survey responses, subscription tiers, or demographic categories.',
    ],
    businessExample:
      'Testing if customer churn status (Yes/No) is independent of billing frequency (Monthly vs Annual).',
    dataRequirements: '2 Categorical columns.',
    assumptions: ['Expected cell counts ≥ 5.', 'Mutually exclusive categories.'],
    howToInterpret: [
      'p < 0.05: The two categorical attributes are statistically dependent.',
      'Cramér’s V: Association strength (<0.1 weak, 0.3 moderate, >0.5 strong).',
    ],
  },
  {
    id: 'kmeans_clustering',
    name: 'K-Means Cluster Analysis (Market Segmentation)',
    category: 'Clustering',
    question: 'How do we naturally segment our customers or vehicle fleet into distinct cohorts?',
    useWhen: [
      'Unsupervised segmentation of customers, products, or battery health profiles.',
      'Partitioning multi-attribute data into k natural clusters with cluster centroids and within-cluster dispersion (WCSS).',
    ],
    businessExample:
      'Segmenting an EV battery fleet by cell temperature, internal resistance, and age to identify healthy vs at-risk clusters.',
    dataRequirements: '2 or more Continuous Numeric feature columns.',
    assumptions: ['Spherical clusters in standardized feature space.', 'User selects number of clusters k.'],
    howToInterpret: [
      'Variance Explained (BCSS / TSS): Proportion of total variance captured by cluster separation.',
      'Centroids: Mean profile of each cluster for business persona labeling.',
    ],
  },
];

export const StatisticalGuideModal: React.FC<StatisticalGuideModalProps> = ({
  isOpen,
  onClose,
  onSelectTest,
}) => {
  const [activeTab, setActiveTab] = useState<'matrix' | 'library'>('matrix');
  const [selectedItem, setSelectedItem] = useState<GuideItem>(GUIDE_ITEMS[0]);
  const [searchFilter, setSearchFilter] = useState<string>('');

  if (!isOpen) return null;

  const filteredItems = GUIDE_ITEMS.filter(
    (item) =>
      item.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      item.category.toLowerCase().includes(searchFilter.toLowerCase()) ||
      item.question.toLowerCase().includes(searchFilter.toLowerCase())
  );

  const handleSelectAndClose = (id: string) => {
    if (onSelectTest) onSelectTest(id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-surface border border-border rounded-xl w-full max-w-5xl h-[88vh] shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-surface-raised/40">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-100">
                BabySQL Enterprise Hypothesis Testing: Statistical Decision Framework
              </h3>
              <p className="text-[11px] text-muted">
                Executive handbook: choosing the right test, business interpretation, and mathematical models
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Switcher Tabs */}
            <div className="flex rounded-lg bg-background p-0.5 border border-border text-xs">
              <button
                onClick={() => setActiveTab('matrix')}
                className={`px-3 py-1 rounded-md transition-all font-medium ${
                  activeTab === 'matrix'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm'
                    : 'text-muted hover:text-slate-200'
                }`}
              >
                Which Test to Use When
              </button>
              <button
                onClick={() => setActiveTab('library')}
                className={`px-3 py-1 rounded-md transition-all font-medium ${
                  activeTab === 'library'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm'
                    : 'text-muted hover:text-slate-200'
                }`}
              >
                Model Handbook
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded text-muted hover:text-slate-200 hover:bg-surface-raised transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* TAB 1: WHICH TEST TO USE WHEN (DECISION MATRIX) */}
        {activeTab === 'matrix' && (
          <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-background text-xs">
            {/* ASCII Decision Map Banner */}
            <div className="p-4 rounded-xl bg-surface border border-border font-mono text-[11px] overflow-x-auto text-cyan-300 leading-tight">
              <div className="text-center font-bold text-slate-200 mb-2 font-sans text-xs uppercase tracking-wider">
                Enterprise Business Research Methods Decision Tree
              </div>
              <pre>{`                               DATA TYPES & BUSINESS USE CASES
                                              │
      ┌──────────────────────────────┬────────┴────────────────────────┬──────────────────────────────┐
      ▼                              ▼                                 ▼                              ▼
 CONTINUOUS / NUMERIC          CATEGORICAL / BINARY             MULTIVARIATE MODELS            UNSUPERVISED LEARNING
 ────────────────────          ────────────────────             ───────────────────            ─────────────────────
 • Welch's t-test (2 groups)   • Chi-Square Test (χ²)           • Simple Linear OLS (1-X)      • K-Means Clustering
 • One-Sample t-test (vs KPI)  • 2-Sample Z-Prop (A/B Test)     • Multiple OLS (Multi-X + VIF)   (Segment profiling & WCSS)
 • Paired t-test (Before/After)• Fisher's Exact (Small 2x2)     • Binary Logistic Regression
 • One-Way ANOVA (3+ groups)                                      (Odds ratios & Confusion)
 • Mann-Whitney U (Non-param)                                   • Pearson & Spearman Corr
 • Kruskal-Wallis (ANOVA non-param)
 • Wilcoxon Signed-Rank (Paired non-param)`}</pre>
            </div>

            {/* Comprehensive Decision Matrix Table */}
            <div className="rounded-xl border border-border bg-surface overflow-hidden">
              <div className="p-3 border-b border-border bg-surface-raised/40 flex items-center justify-between">
                <span className="font-semibold text-slate-200">
                  Business Research Methods (BRM) Decision Guide
                </span>
                <span className="text-[11px] text-muted">
                  Click "Select in Studio" to configure any test immediately
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-surface-raised/60 text-[10px] uppercase font-semibold text-muted border-b border-border">
                    <tr>
                      <th className="px-3.5 py-2.5">Primary Business Goal</th>
                      <th className="px-3 py-2.5">Outcome Variable (Y)</th>
                      <th className="px-3 py-2.5">Predictor / Grouping (X)</th>
                      <th className="px-3 py-2.5">Recommended Statistical Model</th>
                      <th className="px-3 py-2.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border text-[11px]">
                    {[
                      {
                        goal: 'Compare 2 Cohorts (A/B Test)',
                        y: 'Continuous (Revenue, Speed)',
                        x: '2 Independent Groups (Variant A vs B)',
                        model: "Two-Sample Welch's t-Test",
                        testId: 'welch_ttest',
                        badge: 'A/B Test',
                      },
                      {
                        goal: 'A/B Test Conversion Rates',
                        y: 'Binary (Converted 1/0, Yes/No)',
                        x: '2 Cohorts (Control vs Treatment)',
                        model: 'Two-Sample Z-Test of Proportions',
                        testId: 'proportion_ztest',
                        badge: 'Conversion A/B',
                      },
                      {
                        goal: 'Compare 3+ Departments or Groups',
                        y: 'Continuous (Sales, Output)',
                        x: '3+ Categorical Groups',
                        model: 'One-Way ANOVA (F-Test)',
                        testId: 'one_way_anova',
                        badge: 'Multi-Group',
                      },
                      {
                        goal: 'Before vs After Intervention',
                        y: 'Continuous Paired Measure',
                        x: 'Same subjects across 2 timepoints',
                        model: 'Paired Samples t-Test',
                        testId: 'paired_ttest',
                        badge: 'Before / After',
                      },
                      {
                        goal: 'Compare Average to KPI Target',
                        y: 'Continuous Sample Metric',
                        x: 'None (vs Constant μ₀ Benchmark)',
                        model: 'One-Sample t-Test',
                        testId: 'one_sample_ttest',
                        badge: 'Benchmark',
                      },
                      {
                        goal: 'Test Association Between 2 Attributes',
                        y: 'Categorical (Tier, Status)',
                        x: 'Categorical (Device, Payment)',
                        model: 'Chi-Square Independence (χ²)',
                        testId: 'chi_square',
                        badge: 'Contingency',
                      },
                      {
                        goal: 'Predict Y from Multiple Drivers',
                        y: 'Continuous (Revenue, Battery Health)',
                        x: 'Multiple Predictors (X₁, X₂, ...)',
                        model: 'Multiple Linear Regression (OLS)',
                        testId: 'multiple_regression',
                        badge: 'Multivariate OLS',
                      },
                      {
                        goal: 'Predict Binary Failure, Churn, Default',
                        y: 'Binary Y ∈ {0, 1}',
                        x: 'Multiple Risk Factors',
                        model: 'Binary Logistic Regression (Logit)',
                        testId: 'logistic_regression',
                        badge: 'Logit Classification',
                      },
                      {
                        goal: 'Compare 2 Skewed / Heavy-Tailed Groups',
                        y: 'Skewed Continuous / Ordinal',
                        x: '2 Groups (Outlier Resistant)',
                        model: 'Mann-Whitney U (Wilcoxon Rank-Sum)',
                        testId: 'mann_whitney',
                        badge: 'Non-Parametric',
                      },
                      {
                        goal: 'Compare 3+ Groups on Skewed Data / CSAT',
                        y: 'Ordinal (1-5 Star) / Non-Normal',
                        x: '3+ Categorical Groups',
                        model: 'Kruskal-Wallis H-Test',
                        testId: 'kruskal_wallis',
                        badge: 'Non-Parametric',
                      },
                      {
                        goal: 'Paired Before/After on Skewed Scales',
                        y: 'Ordinal / Skewed Paired Measure',
                        x: 'Same subjects across 2 timepoints',
                        model: 'Wilcoxon Signed-Rank Test',
                        testId: 'wilcoxon_signed_rank',
                        badge: 'Non-Parametric',
                      },
                      {
                        goal: 'Monotonic Rank Association',
                        y: 'Continuous / Ordinal',
                        x: 'Continuous / Ordinal',
                        model: "Spearman's Rank Correlation",
                        testId: 'spearman_correlation',
                        badge: 'Non-Parametric',
                      },
                      {
                        goal: 'Market Segmentation & Profiling',
                        y: 'Unsupervised (No Target)',
                        x: '2+ Continuous Feature Attributes',
                        model: 'K-Means Cluster Analysis',
                        testId: 'kmeans_clustering',
                        badge: 'Cluster Analysis',
                      },
                    ].map((row, idx) => (
                      <tr key={idx} className="hover:bg-surface-raised/40 transition-colors">
                        <td className="px-3.5 py-2.5 font-medium text-slate-200">{row.goal}</td>
                        <td className="px-3 py-2.5 text-slate-400 font-mono text-[10px]">{row.y}</td>
                        <td className="px-3 py-2.5 text-slate-400 font-mono text-[10px]">{row.x}</td>
                        <td className="px-3 py-2.5">
                          <span className="font-semibold text-cyan-300">{row.model}</span>
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <button
                            onClick={() => handleSelectAndClose(row.testId)}
                            className="px-2.5 py-1 rounded bg-primary/20 hover:bg-primary/30 text-cyan-300 text-[10px] font-semibold border border-primary/40 transition-all cursor-pointer"
                          >
                            Select in Studio
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: DETAILED MODEL HANDBOOK */}
        {activeTab === 'library' && (
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
                      className={`w-full text-left p-2.5 rounded-lg text-xs transition-all flex flex-col gap-0.5 cursor-pointer ${
                        isSelected
                          ? 'bg-primary/20 border border-primary/40 text-cyan-300'
                          : 'hover:bg-surface-raised/50 text-slate-300 border border-transparent'
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
                  <span>Enterprise Hypothesis Model</span>
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
              <div className="space-y-2">
                <h4 className="text-[11px] font-semibold uppercase text-slate-300 flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                  <span>When to Use This Test in Business</span>
                </h4>
                <ul className="space-y-1.5 text-slate-300 pl-4 list-disc marker:text-cyan-400 leading-relaxed text-[11px]">
                  {selectedItem.useWhen.map((point, idx) => (
                    <li key={idx}>{point}</li>
                  ))}
                </ul>
              </div>

              {/* Concrete Business Example */}
              <div className="p-3.5 rounded-lg bg-surface-raised/40 border border-border">
                <h4 className="text-[10px] font-semibold uppercase text-cyan-400 mb-1">Practical Business Scenario</h4>
                <p className="text-slate-200 text-xs leading-relaxed">{selectedItem.businessExample}</p>
              </div>

              {/* Data Requirements & Assumptions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-surface border border-border">
                  <h5 className="text-[10px] font-semibold uppercase text-muted mb-1 flex items-center gap-1">
                    <BarChart2 className="w-3 h-3 text-cyan-400" />
                    <span>Data Input Requirements</span>
                  </h5>
                  <p className="text-slate-300 font-mono text-[11px]">{selectedItem.dataRequirements}</p>
                </div>
                <div className="p-3 rounded-lg bg-surface border border-border">
                  <h5 className="text-[10px] font-semibold uppercase text-muted mb-1 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                    <span>Mathematical Assumptions</span>
                  </h5>
                  <ul className="text-slate-400 text-[10px] space-y-1 list-disc pl-3">
                    {selectedItem.assumptions.map((asm, i) => (
                      <li key={i}>{asm}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* How to Interpret */}
              <div className="space-y-2">
                <h4 className="text-[11px] font-semibold uppercase text-slate-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                  <span>How to Interpret the Output</span>
                </h4>
                <div className="space-y-1.5 text-[11px] text-slate-300">
                  {selectedItem.howToInterpret.map((interp, idx) => (
                    <div key={idx} className="p-2 rounded bg-surface/50 border border-border flex items-start gap-2">
                      <ChevronRight className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                      <span>{interp}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Select Test CTA */}
              <div className="pt-2 border-t border-border flex justify-end">
                <button
                  onClick={() => handleSelectAndClose(selectedItem.id)}
                  className="px-4 py-2 rounded-lg bg-primary hover:bg-primary-hover text-slate-950 font-semibold text-xs flex items-center gap-1.5 transition-all shadow cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5 fill-current" />
                  <span>Configure {selectedItem.name} in Studio</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
