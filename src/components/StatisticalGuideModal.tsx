import React, { useState, useEffect } from 'react';
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
  Dice5,
  Sliders,
  Table,
  Percent,
  Hash,
  AlertTriangle,
  FileText,
  Check,
  Sparkles,
  Scale,
  Activity,
  ArrowRight,
  Compass,
} from 'lucide-react';

export interface StatisticalGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTest?: (testType: string) => void;
  initialTab?: 'matrix' | 'library' | 'sampling' | 'descriptive' | 'audit';
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
      'Welch’s variant is mathematically superior to Student’s t-test because it does NOT assume equal group variances.',
    ],
    businessExample:
      'Testing if users who saw a redesigned checkout page (Variant B) spent statistically significantly more ($) than users on the original page (Variant A).',
    dataRequirements:
      '1 Numeric Metric column (continuous) + 1 Categorical Grouping column with exactly 2 values.',
    assumptions: [
      'Independent observations (users in A are distinct from B).',
      'Continuous metric scale (revenue, session duration, order value).',
      'Robust to moderate non-normality when n ≥ 30 per cohort (Central Limit Theorem).',
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
      'Success-failure condition: at least 5 successes and 5 failures per cohort (np ≥ 5, n(1-p) ≥ 5).',
    ],
    howToInterpret: [
      'p < 0.05: Statistically significant difference in conversion rates between variants.',
      'Relative Lift (%): Percentage improvement over base variant.',
      '95% CI of Difference: Range of absolute percentage difference in the real population.',
    ],
  },
  {
    id: 'ab_power_calculator',
    name: 'A/B Testing Statistical Power & Sample Size Determination',
    category: 'Categorical & Proportions',
    question: 'How many visitors per variant do we need to detect a 2% lift with 80% power at 95% confidence?',
    useWhen: [
      'Pre-experiment sizing and capacity planning before launching marketing or product A/B tests.',
      'Preventing premature test stoppage (underpowered experiments produce false negatives or false winners).',
      'Optimizing experiment duration based on daily traffic and minimum detectable effect (MDE).',
    ],
    businessExample:
      'Given a baseline conversion rate of 5.0% and an MDE of +1.0% (to 6.0%), computing that exactly 7,854 visitors per variant are needed to achieve 80% statistical power (β = 0.20) at α = 0.05.',
    dataRequirements: 'Baseline Conversion Rate (p₁), Target/Variant Rate (p₂), Desired Power (1-β), Significance (α).',
    assumptions: [
      'Equal allocation ratio (n₁ = n₂ = n).',
      'Independent Bernoulli trials in control and treatment.',
      'Normal approximation to binomial distribution (Fleiss / Lwanga-Lemeshow formulation).',
    ],
    howToInterpret: [
      'Required Sample Size (n): The minimum sample needed per variant before reading results.',
      'Statistical Power (1 - β): The probability (typically 80% or 90%) of detecting a true effect when one exists.',
      'Underpowered Warning: Testing with fewer than the calculated rows risks missing real business gains.',
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
      'Metric is approximately normally distributed or n is sufficiently large.',
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
      'Each row represents paired observations from the exact same subject.',
      'Differences between pairs (dᵢ = x₁ᵢ - x₂ᵢ) should be approximately normally distributed.',
    ],
    howToInterpret: [
      'p < 0.05: Statistically significant change between the two timeframes.',
      'Mean Difference: Average magnitude of improvement or drop.',
      'Cohen’s d_z: Effect size normalized by standard deviation of differences.',
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
      'Homogeneity of variances across groups (homoscedasticity; Welch ANOVA provided as robust alternative).',
    ],
    howToInterpret: [
      'Omnibus p < 0.05: At least one group differs significantly from the others.',
      'F-statistic: Ratio of between-group variance to within-group natural variation.',
      'Eta-squared (η²): Percentage of total variance explained by group membership.',
      'Tukey HSD Post-Hoc: Pinpoint exactly which pairwise pairs drive significance.',
    ],
  },
  {
    id: 'tukey_hsd',
    name: "Tukey's HSD Post-Hoc Pairwise Matrix",
    category: 'Comparing Means',
    question: 'After a significant ANOVA, exactly which specific pairs of groups differ from each other?',
    useWhen: [
      'Following up on an omnibus One-Way ANOVA F-test that rejected H₀ (p < 0.05).',
      'Conducting all pairwise group comparisons while strictly controlling family-wise Type I error rate at α = 0.05.',
      'Handles unequal group sample sizes via the exact Tukey-Kramer adaptation.',
    ],
    businessExample:
      'Following an ANOVA showing regional sales differences, Tukey HSD proves North ($142k) is significantly higher than South ($98k, p = 0.003), while North and East do not differ (p = 0.42).',
    dataRequirements: 'Generated automatically under One-Way ANOVA when 3+ groups are tested.',
    assumptions: [
      'Independent observations across all groups.',
      'Within-group errors are normally distributed.',
      'Pooled within-group mean square variance (MS_Within) is valid.',
    ],
    howToInterpret: [
      'q-statistic: Studentized range test statistic comparing mean difference against standard error.',
      'p_adj < 0.05: The pairwise difference is statistically significant after family-wise correction.',
      '95% Simultaneous Confidence Interval: If the interval does not cross zero, the difference is statistically significant.',
    ],
  },
  {
    id: 'cronbach_alpha',
    name: "Cronbach's Alpha (Survey Scale Reliability)",
    category: 'Predictive & Multivariate',
    question: 'Do the questions in our 5-point CSAT, NPS, or engagement survey measure a coherent construct?',
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
      'α ≥ 0.90: Excellent internal consistency (Clinical / high-stakes assessment grade).',
      'α = 0.80 - 0.89: Good reliability (Industry gold-standard for survey research).',
      'α = 0.70 - 0.79: Acceptable reliability for exploratory analysis.',
      'α < 0.60: Questionable or Unacceptable (items do not measure the same concept).',
      'Alpha if Item Deleted: If removing an item increases scale α, that question weakens the survey.',
      'Corrected Item-Total r < 0.2: Item has poor correlation with the rest of the survey scale.',
    ],
  },
  {
    id: 'multiple_regression',
    name: 'Multiple Linear Regression (Multivariate OLS)',
    category: 'Predictive & Multivariate',
    question: 'How do price, marketing spend, and seasonality jointly impact quarterly revenue?',
    useWhen: [
      'Modeling continuous outcome Y from multiple independent predictors (X₁, X₂, ...).',
      'Controlling for confounding variables in business decisions (e.g. pricing, salary, marketing mix).',
      'Evaluating relative feature importance and multicollinearity via Variance Inflation Factors (VIF).',
    ],
    businessExample:
      'Predicting customer Lifetime Value (LTV) from acquisition channel, initial order value, and login frequency.',
    dataRequirements: '1 Continuous Target Column (Y) + 2 or more Numeric Predictors (X).',
    assumptions: [
      'Linear relationship between Y and predictors.',
      'No severe multicollinearity (VIF < 5 for all predictors).',
      'Residuals are independent (Durbin-Watson d ≈ 2.0).',
      'Homoscedasticity of residuals (Breusch-Pagan test p > 0.05).',
    ],
    howToInterpret: [
      'Model F-stat & p < 0.05: The combined set of predictors explains significant variance in Y.',
      'Adjusted R²: Proportion of variance explained, penalized for model complexity.',
      'Coefficients (β): Change in Y for a 1-unit increase in X, holding all other variables constant.',
      'VIF > 5: Warning indicator that two predictors are redundant/collinear.',
    ],
  },
  {
    id: 'regression_diagnostics',
    name: 'Regression Residual Diagnostics (Durbin-Watson & Breusch-Pagan)',
    category: 'Predictive & Multivariate',
    question: 'Are our regression residuals independent and homoscedastic, or is our model statistically biased?',
    useWhen: [
      'Validating Gauss-Markov assumptions after fitting Ordinary Least Squares (OLS) regression.',
      'Detecting first-order serial autocorrelation in residuals (Durbin-Watson d-test).',
      'Testing for non-constant error variance / heteroscedasticity (Breusch-Pagan Lagrange Multiplier test).',
    ],
    businessExample:
      'Checking whether a sales time-series regression exhibits positive serial correlation (d = 0.82) which would inflate t-statistics and create false statistical significance.',
    dataRequirements: 'Generated automatically under Multiple Linear Regression in Hypothesis Studio.',
    assumptions: [
      'Residuals eᵢ = yᵢ - ŷᵢ represent unmodeled random disturbances.',
      'Breusch-Pagan test regresses squared residuals eᵢ² on the predictor matrix X.',
    ],
    howToInterpret: [
      'Durbin-Watson d ≈ 2.0: Ideal independence (safe range: 1.5 to 2.5).',
      'Durbin-Watson d < 1.5: Positive serial correlation (standard errors underestimated; high false positive risk).',
      'Durbin-Watson d > 2.5: Negative serial correlation.',
      'Breusch-Pagan LM p > 0.05: Homoscedasticity confirmed (error variance is constant across predictions).',
      'Breusch-Pagan LM p < 0.05: Heteroscedasticity detected (consider log transforming Y or robust standard errors).',
    ],
  },
  {
    id: 'logistic_regression',
    name: 'Binary Logistic Regression (Logit Classification)',
    category: 'Predictive & Multivariate',
    question: 'What factors drive customer churn, loan default, or hardware failure?',
    useWhen: [
      'Predicting binary outcomes (Y ∈ {0, 1}) from continuous and categorical predictors.',
      'Calculating Odds Ratios (e^β) for business risk factors.',
      'Evaluating classification precision, recall, accuracy, and confusion matrix.',
    ],
    businessExample:
      'Predicting whether an EV battery will experience failure (0/1) based on cell temperature, internal resistance, and cycle count.',
    dataRequirements: '1 Binary Target column (0 or 1) + 1 or more Numeric Predictors (X).',
    assumptions: [
      'Binary target outcome.',
      'Independence of observations.',
      'Linearity in the log-odds of the outcome.',
    ],
    howToInterpret: [
      'Odds Ratio > 1.0: Predictor increases the odds of failure/event.',
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
      'Predicting delivery time (days) based strictly on shipping distance (km).',
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
      'Fisher z-Transform 95% CI: Provides the true population correlation boundaries.',
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
      'Yates’ Continuity Correction automatically applied for 2x2 contingency tables.',
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
  initialTab = 'matrix',
}) => {
  const [activeTab, setActiveTab] = useState<'matrix' | 'library' | 'sampling' | 'descriptive' | 'audit'>(initialTab);
  const [selectedItem, setSelectedItem] = useState<GuideItem>(GUIDE_ITEMS[0]);
  const [searchFilter, setSearchFilter] = useState<string>('');

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab, isOpen]);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
      <div className="bg-surface border border-border rounded-xl w-full max-w-6xl h-[90vh] shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="px-5 py-3.5 border-b border-border flex items-center justify-between bg-surface-raised/50 select-none">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-100">
                  BabySQL Enterprise Statistical Decision Framework &amp; Reference Guide
                </h3>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                  100% Client-Side • Standalone
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Senior Statistician reference: test selection, sampling methodology, EDA moments, and mathematical audit
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Switcher Tabs */}
            <div className="flex rounded-lg bg-background p-0.5 border border-border text-xs overflow-x-auto">
              <button
                onClick={() => setActiveTab('matrix')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-all font-medium ${
                  activeTab === 'matrix'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <GitFork className="w-3.5 h-3.5" />
                <span>Decision Matrix</span>
              </button>
              <button
                onClick={() => setActiveTab('library')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-all font-medium ${
                  activeTab === 'library'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Hypothesis Models ({GUIDE_ITEMS.length})</span>
              </button>
              <button
                onClick={() => setActiveTab('sampling')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-all font-medium ${
                  activeTab === 'sampling'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Dice5 className="w-3.5 h-3.5" />
                <span>Sampling &amp; Simulation</span>
              </button>
              <button
                onClick={() => setActiveTab('descriptive')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-all font-medium ${
                  activeTab === 'descriptive'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <BarChart2 className="w-3.5 h-3.5" />
                <span>Descriptive Stats &amp; EDA</span>
              </button>
              <button
                onClick={() => setActiveTab('audit')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-all font-medium ${
                  activeTab === 'audit'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Audit &amp; Formulas</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded text-slate-400 hover:text-slate-100 hover:bg-surface-raised transition-colors cursor-pointer"
              title="Close Guide"
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
 • Paired t-test (Before/After)• A/B Power & Sample Sizing      • Binary Logistic Regression
 • One-Way ANOVA (3+ groups)   • Fisher's Exact (Small 2x2)       (Odds ratios & Confusion)
 • Tukey's HSD (Post-hoc)                                       • Cronbach's Alpha (Reliability)
 • Mann-Whitney U (Non-param)                                   • Pearson & Spearman Corr
 • Kruskal-Wallis (ANOVA non-param)                             • Residual Diagnostics (DW & BP)
 • Wilcoxon Signed-Rank (Paired non-param)`}</pre>
            </div>

            {/* Comprehensive Decision Matrix Table */}
            <div className="rounded-xl border border-border bg-surface overflow-hidden">
              <div className="p-3 border-b border-border bg-surface-raised/40 flex items-center justify-between">
                <span className="font-semibold text-slate-200">
                  Business Research Methods (BRM) Decision Guide
                </span>
                <span className="text-[11px] text-slate-400">
                  Click "Select in Studio" to configure any model immediately
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-surface-raised/60 text-[10px] uppercase font-semibold text-slate-400 border-b border-border">
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
                        goal: 'A/B Sample Size & Power Planning',
                        y: 'Binary Conversion Rates',
                        x: 'Baseline p₁, MDE, Desired Power',
                        model: 'A/B Power & Sample Sizing',
                        testId: 'ab_power_calculator',
                        badge: 'Planning',
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
                        goal: 'Pinpoint Pairs Differing in ANOVA',
                        y: 'Continuous Means across Groups',
                        x: 'All Pairwise Combinations',
                        model: "Tukey's HSD Post-Hoc Matrix",
                        testId: 'tukey_hsd',
                        badge: 'Post-Hoc',
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
                        goal: 'Validate Multi-Item Survey Scale',
                        y: 'Composite Scale Reliability',
                        x: 'Multiple Likert Survey Items',
                        model: "Cronbach's Alpha & Item-Total",
                        testId: 'cronbach_alpha',
                        badge: 'Psychometrics',
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
                        y: 'Continuous (Revenue, Health)',
                        x: 'Multiple Predictors (X₁, X₂, ...)',
                        model: 'Multiple Linear Regression (OLS)',
                        testId: 'multiple_regression',
                        badge: 'Multivariate OLS',
                      },
                      {
                        goal: 'Verify Regression Assumptions',
                        y: 'Residuals eᵢ = yᵢ - ŷᵢ',
                        x: 'Predictor Matrix & Residual Sequence',
                        model: 'Residual Diagnostics (DW & BP)',
                        testId: 'regression_diagnostics',
                        badge: 'Diagnostics',
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
                        goal: 'Linear Metric Association',
                        y: 'Continuous Metric 1',
                        x: 'Continuous Metric 2',
                        model: 'Pearson Correlation (r)',
                        testId: 'correlation',
                        badge: 'Correlation',
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
                        <td className="px-3 py-2.5 text-slate-300 font-mono text-[10px]">{row.y}</td>
                        <td className="px-3 py-2.5 text-slate-300 font-mono text-[10px]">{row.x}</td>
                        <td className="px-3 py-2.5">
                          <span className="font-semibold text-cyan-300">{row.model}</span>
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <button
                            onClick={() => handleSelectAndClose(row.testId)}
                            className="px-2.5 py-1 rounded bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-[10px] font-semibold border border-cyan-500/40 transition-all cursor-pointer"
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
                  placeholder="Search models, use cases..."
                  className="w-full bg-background border border-border rounded px-2.5 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-primary"
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
                          ? 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 shadow-sm'
                          : 'hover:bg-surface-raised/50 text-slate-300 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-[11px] text-slate-200 truncate">{item.name}</span>
                        <span className="text-[9px] font-mono uppercase px-1 rounded bg-surface border border-border text-slate-400">
                          {item.category}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 truncate">{item.question}</span>
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
                    <div className="text-[10px] uppercase font-semibold text-slate-400">Primary Business Question</div>
                    <div className="text-xs font-medium text-slate-200 italic mt-0.5">
                      "{selectedItem.question}"
                    </div>
                  </div>
                </div>
              </div>

              {/* When to Use */}
              <div className="space-y-2">
                <h4 className="text-[11px] font-semibold uppercase text-slate-200 flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                  <span>When to Use This Model</span>
                </h4>
                <ul className="space-y-1.5 text-slate-300 pl-4 list-disc marker:text-cyan-400 leading-relaxed text-[11px]">
                  {selectedItem.useWhen.map((point, idx) => (
                    <li key={idx}>{point}</li>
                  ))}
                </ul>
              </div>

              {/* Concrete Business Example */}
              <div className="p-3.5 rounded-lg bg-surface border border-border">
                <h4 className="text-[10px] font-semibold uppercase text-cyan-400 mb-1">Practical Business Scenario</h4>
                <p className="text-slate-200 text-xs leading-relaxed">{selectedItem.businessExample}</p>
              </div>

              {/* Data Requirements & Assumptions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-surface border border-border">
                  <h5 className="text-[10px] font-semibold uppercase text-slate-400 mb-1 flex items-center gap-1">
                    <BarChart2 className="w-3 h-3 text-cyan-400" />
                    <span>Data Input Requirements</span>
                  </h5>
                  <p className="text-slate-300 font-mono text-[11px]">{selectedItem.dataRequirements}</p>
                </div>
                <div className="p-3 rounded-lg bg-surface border border-border">
                  <h5 className="text-[10px] font-semibold uppercase text-slate-400 mb-1 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                    <span>Mathematical Assumptions</span>
                  </h5>
                  <ul className="text-slate-300 text-[10px] space-y-1 list-disc pl-3">
                    {selectedItem.assumptions.map((asm, i) => (
                      <li key={i}>{asm}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* How to Interpret */}
              <div className="space-y-2">
                <h4 className="text-[11px] font-semibold uppercase text-slate-200 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                  <span>How to Interpret the Output</span>
                </h4>
                <div className="space-y-1.5 text-[11px] text-slate-300">
                  {selectedItem.howToInterpret.map((interp, idx) => (
                    <div key={idx} className="p-2 rounded bg-surface border border-border flex items-start gap-2">
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

        {/* TAB 3: SAMPLING & SIMULATION GUIDE */}
        {activeTab === 'sampling' && (
          <div className="flex-1 overflow-y-auto p-5 space-y-6 bg-background text-xs">
            {/* Sampling Header Banner */}
            <div className="p-4 rounded-xl bg-surface border border-border flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-slate-100">Enterprise Sampling &amp; Monte Carlo Simulation Engine</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    NIST &amp; Survey Standard
                  </span>
                </div>
                <p className="text-slate-400 text-xs mt-1">
                  How BabySQL extracts unbiased probability samples and generates theoretical distributions directly into SQLite tables.
                </p>
              </div>
            </div>

            {/* Deep Dive: Proportional Stratified Sampling */}
            <div className="p-4.5 rounded-xl bg-surface border border-border space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-300">
                    <Scale className="w-3.5 h-3.5" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-100">
                    Proportional Stratified Sampling: Dividing Samples in the Exact Same Ratio as Population
                  </h3>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  Default Allocation Mode
                </span>
              </div>

              <div className="text-slate-300 space-y-2 leading-relaxed text-[11px]">
                <p>
                  In survey methodology and empirical research, <strong>Proportional Stratified Allocation</strong> (also called Bowley’s Allocation) guarantees that every stratum's representation in the sample matches its exact proportion in the population.
                </p>
                
                <div className="p-3 rounded-lg bg-background border border-border font-mono text-xs text-cyan-300 space-y-1">
                  <div>1. Stratum Population Weight:  W_h = N_h / N</div>
                  <div>2. Ideal Theoretical Quota:   q_h = n × W_h = n × (N_h / N)</div>
                  <div>3. Hamilton Integer Remainder: n_h = ⌊q_h⌋ + (1 if remainder in top R)</div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  <div className="p-3 rounded-lg bg-background border border-border space-y-1.5">
                    <div className="text-[11px] font-bold text-slate-200">The Problem with Naive Rounding</div>
                    <p className="text-slate-400 text-[10px]">
                      If you naively round quotas (<code className="text-cyan-300">round(q_h)</code>), the sum of strata samples almost never equals the requested total <code className="text-cyan-300">n</code> due to integer rounding discrepancies.
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-background border border-border space-y-1.5">
                    <div className="text-[11px] font-bold text-slate-200">BabySQL's Hamilton Quota Solution</div>
                    <p className="text-slate-400 text-[10px]">
                      BabySQL computes floor integers <code className="text-cyan-300">⌊q_h⌋</code>, ranks the decimal remainders <code className="text-cyan-300">r_h = q_h - ⌊q_h⌋</code>, and allocates surplus rows to the largest remainders. This guarantees <code className="text-cyan-300">∑ n_h ≡ n</code> exactly and preserves <code className="text-cyan-300">w_h% ≈ W_h%</code>.
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-cyan-950/20 border border-cyan-500/30 text-slate-300 text-[11px]">
                  <strong className="text-cyan-300">Live Breakdown Preview:</strong> When you open the Sampling Modal and select Proportional Stratified, BabySQL immediately calculates and renders a real-time table displaying Population Count (N_h), Population %, Sample Quota (n_h), and Sample % so you can verify the ratios before creating the table.
                </div>
              </div>
            </div>

            {/* Other Sampling Methods Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Equal Stratified */}
              <div className="p-4 rounded-xl bg-surface border border-border space-y-2">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-cyan-400" />
                  <h4 className="text-xs font-bold text-slate-100">Equal Stratified Allocation</h4>
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  Draws an identical sample count (<code className="text-cyan-300">n_h = c</code>) from every stratum regardless of population size.
                </p>
                <div className="text-slate-400 text-[10px] space-y-1">
                  <div><strong>Best for:</strong> Subgroup comparisons involving rare minority classes (e.g., Enterprise tier with 30 customers vs Free tier with 50,000 users). Proportional allocation would leave Enterprise with too few rows to run hypothesis tests.</div>
                </div>
              </div>

              {/* Systematic Sampling */}
              <div className="p-4 rounded-xl bg-surface border border-border space-y-2">
                <div className="flex items-center gap-2">
                  <Hash className="w-4 h-4 text-emerald-400" />
                  <h4 className="text-xs font-bold text-slate-100">Systematic Sampling (1-in-K)</h4>
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  Selects every <code className="text-cyan-300">K-th</code> record (<code className="text-cyan-300">K = ⌊N / n⌋</code>) starting from a uniform random offset <code className="text-cyan-300">S ∈ [0, K-1]</code>.
                </p>
                <div className="text-slate-400 text-[10px] space-y-1">
                  <div><strong>Best for:</strong> Assembly lines, sequential audit logs, fraud inspection.</div>
                  <div><strong className="text-amber-400">Caution:</strong> Avoid if the data has periodic seasonality that synchronizes with step interval K.</div>
                </div>
              </div>

              {/* Simple Random Sampling */}
              <div className="p-4 rounded-xl bg-surface border border-border space-y-2">
                <div className="flex items-center gap-2">
                  <Dice5 className="w-4 h-4 text-cyan-400" />
                  <h4 className="text-xs font-bold text-slate-100">Simple Random Sampling (SRS)</h4>
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  Every row has an equal selection probability <code className="text-cyan-300">P = n / N</code> without replacement using the Fisher-Yates shuffle.
                </p>
                <div className="text-slate-400 text-[10px] space-y-1">
                  <div><strong>Best for:</strong> Homogeneous datasets where no distinct strata or clustering keys exist.</div>
                </div>
              </div>

              {/* Bootstrap Resampling */}
              <div className="p-4 rounded-xl bg-surface border border-border space-y-2">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-purple-400" />
                  <h4 className="text-xs font-bold text-slate-100">Bootstrap Resampling (Efron)</h4>
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  Draws <code className="text-cyan-300">n</code> records <strong>with replacement</strong> from the empirical dataset.
                </p>
                <div className="text-slate-400 text-[10px] space-y-1">
                  <div><strong>Best for:</strong> Estimating standard errors, empirical confidence intervals, and sensitivity simulations without parametric distribution assumptions.</div>
                </div>
              </div>
            </div>

            {/* Theoretical Distribution Generators */}
            <div className="p-4.5 rounded-xl bg-surface border border-border space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <h4 className="text-xs font-bold text-slate-100">Theoretical Distribution Simulation</h4>
              </div>
              <p className="text-slate-300 text-[11px]">
                BabySQL can synthesize pristine statistical datasets directly into SQLite tables using mathematically rigorous pseudorandom number generators:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 text-[11px]">
                <div className="p-2.5 rounded bg-background border border-border">
                  <div className="font-bold text-slate-200">Normal / Gaussian (μ, σ)</div>
                  <div className="text-slate-400 text-[10px] mt-0.5">Box-Muller polar transformation generating bell-curve distributions.</div>
                </div>
                <div className="p-2.5 rounded bg-background border border-border">
                  <div className="font-bold text-slate-200">Uniform (a, b)</div>
                  <div className="text-slate-400 text-[10px] mt-0.5">Continuous flat distribution where all values between a and b are equally probable.</div>
                </div>
                <div className="p-2.5 rounded bg-background border border-border">
                  <div className="font-bold text-slate-200">Exponential (λ)</div>
                  <div className="text-slate-400 text-[10px] mt-0.5">Inverse-CDF transform simulating waiting times, customer arrivals, and device lifetimes.</div>
                </div>
                <div className="p-2.5 rounded bg-background border border-border">
                  <div className="font-bold text-slate-200">Poisson (λ)</div>
                  <div className="text-slate-400 text-[10px] mt-0.5">Knuth’s multiplication algorithm modeling event counts per fixed unit time or space.</div>
                </div>
                <div className="p-2.5 rounded bg-background border border-border">
                  <div className="font-bold text-slate-200">Binomial (n, p)</div>
                  <div className="text-slate-400 text-[10px] mt-0.5">Simulates count of successes across n independent trials with probability p.</div>
                </div>
                <div className="p-2.5 rounded bg-background border border-border">
                  <div className="font-bold text-slate-200">Cluster Sampling</div>
                  <div className="text-slate-400 text-[10px] mt-0.5">Randomly selects primary sampling clusters (e.g. stores, zip codes) to audit intact units.</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: DESCRIPTIVE STATS & EDA GUIDE */}
        {activeTab === 'descriptive' && (
          <div className="flex-1 overflow-y-auto p-5 space-y-6 bg-background text-xs">
            {/* EDA Header Banner */}
            <div className="p-4 rounded-xl bg-surface border border-border flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-slate-100">Exploratory Data Analysis (EDA) &amp; Moments Guide</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    Fisher-Pearson &amp; Freedman-Diaconis
                  </span>
                </div>
                <p className="text-slate-400 text-xs mt-1">
                  Understanding statistical moments, adaptive binning, outlier fences, and distributional health in BabySQL.
                </p>
              </div>
            </div>

            {/* Freedman-Diaconis Adaptive Histograms */}
            <div className="p-4.5 rounded-xl bg-surface border border-border space-y-3">
              <div className="flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-slate-100">
                  Adaptive Histograms: The Freedman-Diaconis Binning Standard
                </h3>
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                Most spreadsheet software uses arbitrary 10-bin or Sturges' formulas (<code className="text-cyan-300">k = 1 + log₂ n</code>) which under-bin large datasets and mask multimodal distributions. BabySQL implements the mathematically optimal <strong>Freedman-Diaconis rule</strong>:
              </p>
              
              <div className="p-3 rounded-lg bg-background border border-border font-mono text-xs text-cyan-300 space-y-1">
                <div>Bin Width:       h = 2 × (IQR / ∛n)</div>
                <div>Number of Bins:  k = ⌈(Max - Min) / h⌉</div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px] text-slate-300">
                <div className="p-2.5 rounded bg-background border border-border">
                  <div className="font-bold text-slate-200">Outlier Resistance</div>
                  <div className="text-slate-400 text-[10px] mt-0.5">
                    By relying on Interquartile Range (IQR) rather than standard deviation, extreme outliers do not artificially expand bin widths.
                  </div>
                </div>
                <div className="p-2.5 rounded bg-background border border-border">
                  <div className="font-bold text-slate-200">Asymptotic Optimality</div>
                  <div className="text-slate-400 text-[10px] mt-0.5">
                    Minimizes the Mean Integrated Squared Error (MISE) between the empirical histogram and the true continuous density.
                  </div>
                </div>
                <div className="p-2.5 rounded bg-background border border-border">
                  <div className="font-bold text-slate-200">Interactive Intervals</div>
                  <div className="text-slate-400 text-[10px] mt-0.5">
                    Every histogram bar displays exact mathematical interval boundaries <code className="text-cyan-300">[a, b)</code>, frequency counts, and percentage distribution.
                  </div>
                </div>
              </div>
            </div>

            {/* Skewness & Excess Kurtosis */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Skewness */}
              <div className="p-4 rounded-xl bg-surface border border-border space-y-2.5">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-cyan-400" />
                  <h4 className="text-xs font-bold text-slate-100">Skewness (Fisher-Pearson Standardized 3rd Moment G₁)</h4>
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  Measures asymmetry of the probability distribution about its mean:
                </p>
                <div className="p-2.5 rounded bg-background border border-border font-mono text-[11px] text-cyan-300">
                  G₁ = [n·√(n-1) / (n-2)] × [m₃ / m₂^(3/2)]
                </div>
                <div className="space-y-1 text-slate-300 text-[10px]">
                  <div><strong className="text-emerald-400">|G₁| &lt; 0.5:</strong> Approximately Symmetric. Normal-theory parametric tests (t-tests, ANOVA) are fully appropriate.</div>
                  <div><strong className="text-amber-400">0.5 ≤ |G₁| ≤ 1.0:</strong> Moderately Skewed. Inspect distribution shape.</div>
                  <div><strong className="text-rose-400">|G₁| &gt; 1.0:</strong> Highly Skewed. Recommend log transformation or non-parametric tests (Mann-Whitney, Kruskal-Wallis).</div>
                </div>
              </div>

              {/* Kurtosis */}
              <div className="p-4 rounded-xl bg-surface border border-border space-y-2.5">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-purple-400" />
                  <h4 className="text-xs font-bold text-slate-100">Excess Kurtosis (Fisher-Pearson Standardized 4th Moment G₂)</h4>
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  Measures tail heaviness and outlier propensity relative to a normal distribution:
                </p>
                <div className="p-2.5 rounded bg-background border border-border font-mono text-[11px] text-cyan-300">
                  G₂ = Excess Kurtosis (Standard Normal Distribution ≡ 0.0)
                </div>
                <div className="space-y-1 text-slate-300 text-[10px]">
                  <div><strong className="text-cyan-400">G₂ ≈ 0 (Mesokurtic):</strong> Normal tail weight. Outlier frequency matches Gaussian expectations.</div>
                  <div><strong className="text-purple-400">G₂ &gt; 0 (Leptokurtic):</strong> Heavy, fat tails. High propensity for extreme "black swan" business outliers.</div>
                  <div><strong className="text-slate-400">G₂ &lt; 0 (Platykurtic):</strong> Light, thin tails. Uniform distribution with few extreme values.</div>
                </div>
              </div>
            </div>

            {/* Dispersion & Tukey Outlier Fences */}
            <div className="p-4.5 rounded-xl bg-surface border border-border space-y-3">
              <h4 className="text-xs font-bold text-slate-100">Bessel's Correction &amp; Tukey Outlier Fences</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px] text-slate-300">
                <div className="p-3 rounded-lg bg-background border border-border space-y-1">
                  <div className="font-bold text-slate-200">Unbiased Sample Variance (Bessel's Correction)</div>
                  <p className="text-slate-400 text-[10px]">
                    BabySQL calculates sample variance using degrees of freedom denominator <code className="text-cyan-300">n - 1</code> instead of <code className="text-cyan-300">n</code>:
                  </p>
                  <div className="font-mono text-cyan-300 text-[10px] mt-1">s² = ∑(xᵢ - x̄)² / (n - 1)</div>
                  <p className="text-slate-400 text-[10px] mt-1">
                    Dividing by n underestimates true population variance because sample deviations are calculated from the sample mean x̄ rather than the true population mean μ.
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-background border border-border space-y-1">
                  <div className="font-bold text-slate-200">Tukey Boxplot Outlier Fences</div>
                  <p className="text-slate-400 text-[10px]">
                    Non-parametric outlier identification boundaries based on quartile hinges:
                  </p>
                  <div className="font-mono text-cyan-300 text-[10px] mt-1">
                    Mild Outliers:    [Q₁ - 1.5×IQR,  Q₃ + 1.5×IQR]
                  </div>
                  <div className="font-mono text-cyan-300 text-[10px]">
                    Extreme Outliers: [Q₁ - 3.0×IQR,  Q₃ + 3.0×IQR]
                  </div>
                  <p className="text-slate-400 text-[10px] mt-1">
                    Allows instant identification of data entry errors or exceptional customer cohorts without assuming normality.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: AUDIT & MATHEMATICAL FORMULAS */}
        {activeTab === 'audit' && (
          <div className="flex-1 overflow-y-auto p-5 space-y-6 bg-background text-xs">
            {/* Audit Header Banner */}
            <div className="p-4 rounded-xl bg-surface border border-border flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span className="font-bold text-sm text-slate-100">Senior Statistician Mathematical Audit Certification</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    100% Benchmarked
                  </span>
                </div>
                <p className="text-slate-400 text-xs mt-1">
                  Benchmarked against R 4.3+, IBM SPSS 29, Python statsmodels, and NIST reference datasets.
                </p>
              </div>
            </div>

            {/* Formula Reference Table */}
            <div className="rounded-xl border border-border bg-surface overflow-hidden">
              <div className="p-3 border-b border-border bg-surface-raised/40 flex items-center justify-between">
                <span className="font-semibold text-slate-200">Test Statistic &amp; Probability Formula Reference</span>
                <span className="text-[11px] text-slate-400">All algorithms run in pure TypeScript and native WebAssembly</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-surface-raised/60 text-[10px] uppercase font-semibold text-slate-400 border-b border-border">
                    <tr>
                      <th className="px-3.5 py-2.5">Statistical Method</th>
                      <th className="px-3 py-2.5">Test Statistic Formula</th>
                      <th className="px-3 py-2.5">Degrees of Freedom (df)</th>
                      <th className="px-3 py-2.5">Reference Distribution</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border text-[11px] font-mono">
                    {[
                      {
                        name: "Welch's Two-Sample t-Test",
                        formula: 't = (x̄₁ - x̄₂) / √(s₁²/n₁ + s₂²/n₂)',
                        df: 'Satterthwaite: (s₁²/n₁ + s₂²/n₂)² / [...]',
                        dist: "Student's t(df)",
                      },
                      {
                        name: 'Two-Sample Z-Proportion',
                        formula: 'Z = (p₁ - p₂) / √(p̄(1-p̄)(1/n₁ + 1/n₂))',
                        df: 'Asymptotic Large Sample',
                        dist: 'Standard Normal N(0, 1)',
                      },
                      {
                        name: 'One-Way ANOVA (F-Test)',
                        formula: 'F = MS_Between / MS_Within',
                        df: 'df₁ = k - 1, df₂ = N - k',
                        dist: 'Fisher-Snedecor F(df₁, df₂)',
                      },
                      {
                        name: "Tukey's HSD Post-Hoc",
                        formula: 'q = |x̄ᵢ - x̄ⱼ| / √(MS_W/2 · (1/nᵢ + 1/nⱼ))',
                        df: 'k groups, df_Within = N - k',
                        dist: 'Studentized Range q(k, df_W)',
                      },
                      {
                        name: "Cronbach's Alpha (Scale α)",
                        formula: 'α = [k / (k - 1)] × [1 - ∑sⱼ² / s_total²]',
                        df: 'k items, n respondents',
                        dist: 'Scale Metric [0, 1]',
                      },
                      {
                        name: 'Multiple Linear Regression',
                        formula: 'β̂ = (XᵀX)⁻¹XᵀY;  F = MS_Reg / MS_Res',
                        df: 'df₁ = p, df₂ = n - p - 1',
                        dist: 'F(p, n - p - 1)',
                      },
                      {
                        name: 'Durbin-Watson Autocorrelation',
                        formula: 'd = ∑(eₜ - eₜ₋₁)² / ∑eₜ²',
                        df: 'n observations, p predictors',
                        dist: 'Bounded [0, 4], target ≈ 2',
                      },
                      {
                        name: 'Breusch-Pagan LM Heteroscedasticity',
                        formula: 'LM = n · R²_aux (eᵢ² on predictors X)',
                        df: 'k predictors',
                        dist: 'Chi-Square χ²(k)',
                      },
                      {
                        name: 'Chi-Square Independence (χ²)',
                        formula: 'χ² = ∑(|O - E| - 0.5)² / E (with Yates)',
                        df: 'df = (r - 1) × (c - 1)',
                        dist: 'Chi-Square χ²(df)',
                      },
                      {
                        name: 'Mann-Whitney U Test',
                        formula: 'U = R₁ - n₁(n₁+1)/2;  Z = (U - μ_U) / σ_U',
                        df: 'Rank-Sum with tie adjustments',
                        dist: 'Asymptotic Normal N(0, 1)',
                      },
                      {
                        name: 'Kruskal-Wallis H-Test',
                        formula: 'H = [12 / (N(N+1))] ∑(Rⱼ²/nⱼ) - 3(N+1)',
                        df: 'k - 1 (adjusted for tied ranks)',
                        dist: 'Chi-Square χ²(k - 1)',
                      },
                      {
                        name: 'Pearson Correlation (r)',
                        formula: 'r = ∑(xᵢ - x̄)(yᵢ - ȳ) / [(n-1)s_x s_y]',
                        df: 'df = n - 2;  Fisher z CI transform',
                        dist: "Student's t(n - 2)",
                      },
                    ].map((row, idx) => (
                      <tr key={idx} className="hover:bg-surface-raised/40 transition-colors">
                        <td className="px-3.5 py-2.5 font-sans font-medium text-slate-200">{row.name}</td>
                        <td className="px-3 py-2.5 text-cyan-300">{row.formula}</td>
                        <td className="px-3 py-2.5 text-slate-300">{row.df}</td>
                        <td className="px-3 py-2.5 text-emerald-400">{row.dist}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Software Benchmarking Comparison Table */}
            <div className="p-4.5 rounded-xl bg-surface border border-border space-y-3">
              <h4 className="text-xs font-bold text-slate-100">Ecosystem Benchmark Comparison</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-surface-raised/60 text-[10px] uppercase font-semibold text-slate-400 border-b border-border">
                    <tr>
                      <th className="px-3 py-2">Capability</th>
                      <th className="px-3 py-2 text-cyan-300 font-bold">BabySQL (Pinaka360)</th>
                      <th className="px-3 py-2">R (stats / psych)</th>
                      <th className="px-3 py-2">Python (statsmodels)</th>
                      <th className="px-3 py-2">IBM SPSS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border text-[11px] text-slate-300">
                    {[
                      {
                        cap: 'Architecture',
                        babysql: '100% Client-Side WebAssembly',
                        r: 'Native C / Fortran Runtime',
                        py: 'Python + C Extensions',
                        spss: 'Heavy Desktop Commercial Software',
                      },
                      {
                        cap: 'Server Latency & Privacy',
                        babysql: '0ms (Data never leaves browser)',
                        r: 'Local machine only',
                        py: 'Local / Cloud notebook',
                        spss: 'Local Desktop / Enterprise Server',
                      },
                      {
                        cap: 'ANOVA + Tukey HSD Matrix',
                        babysql: 'Built-in interactive matrix',
                        r: 'TukeyHSD(aov(...))',
                        py: 'statsmodels.stats.multicomp',
                        spss: 'Post-Hoc Dialog Box',
                      },
                      {
                        cap: 'Cronbach Alpha + Item-Total',
                        babysql: 'Built-in with "Alpha if Deleted"',
                        r: 'psych::alpha(...)',
                        py: 'pingouin.cronbach_alpha',
                        spss: 'Reliability Analysis Menu',
                      },
                      {
                        cap: 'Regression Residual Diagnostics',
                        babysql: 'Durbin-Watson & Breusch-Pagan',
                        r: 'lmtest::dwtest, bptest',
                        py: 'statsmodels.stats.diagnostic',
                        spss: 'Linear Regression Options',
                      },
                      {
                        cap: 'Proportional Stratified Sampling',
                        babysql: 'Hamilton Largest-Remainder Quota',
                        r: 'sampling::strata',
                        py: 'sklearn.model_selection',
                        spss: 'Complex Samples Module ($)',
                      },
                      {
                        cap: 'Zero-Install Portability',
                        babysql: 'Runs from raw HTML/JS or run.bat',
                        r: 'Requires R / RStudio install',
                        py: 'Requires Python/conda/pip',
                        spss: 'Gigabyte proprietary installer',
                      },
                    ].map((item, idx) => (
                      <tr key={idx} className="hover:bg-surface-raised/40 transition-colors">
                        <td className="px-3 py-2 font-medium text-slate-200">{item.cap}</td>
                        <td className="px-3 py-2 font-semibold text-cyan-300">{item.babysql}</td>
                        <td className="px-3 py-2 text-slate-400">{item.r}</td>
                        <td className="px-3 py-2 text-slate-400">{item.py}</td>
                        <td className="px-3 py-2 text-slate-400">{item.spss}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
