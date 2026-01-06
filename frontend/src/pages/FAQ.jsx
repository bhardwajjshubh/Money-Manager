import { useState } from 'react';

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState(0);

  const faqs = [
    {
      question: 'What is Money Manager and what does it do?',
      answer: 'Money Manager is a comprehensive personal finance management application designed to help you track, manage, and optimize your financial activities. It allows you to monitor your income and expenses, set budgets, manage loans, track savings goals, and organize transactions through customizable categories. Our platform provides a complete financial dashboard to help you make informed financial decisions.'
    },
    {
      question: 'How do I add income to my account?',
      answer: 'Navigate to the "Income" section from the main menu. Click on the income entry form to add details like amount, source, date, and category. You can categorize your income (salary, bonus, freelance work, etc.) for better tracking and analysis. All income entries are recorded and displayed in your dashboard for comprehensive financial overview.'
    },
    {
      question: 'How can I track my expenses?',
      answer: 'Go to the "Expenses" section to log all your expenditures. Record the amount, date, category (food, transport, utilities, entertainment, etc.), and optional notes. The system automatically organizes your expenses by category, helping you identify spending patterns and areas where you can reduce costs. You can view expense analytics to understand your spending habits.'
    },
    {
      question: 'What are expense categories and how do I use them?',
      answer: 'Categories are custom tags that help organize your transactions. Navigate to "Categories" to create, edit, or delete categories based on your spending habits. Common categories include Food, Transport, Entertainment, Utilities, Healthcare, Shopping, and Education. By categorizing transactions, you can analyze spending patterns, set category-specific budgets, and generate detailed financial reports.'
    },
    {
      question: 'How do budgets work in Money Manager?',
      answer: 'The "Budgets" section allows you to set monthly spending limits for each category. You can allocate a specific budget amount per category (e.g., ₹500 for groceries, ₹2000 for transport). The system tracks your spending against these budgets and shows you visual progress indicators. You\'ll receive alerts when you\'re approaching or exceeding your budget limits, helping you stay financially disciplined.'
    },
    {
      question: 'How do I manage savings goals?',
      answer: 'In the "Savings" section, you can create and track multiple savings goals (e.g., vacation fund, emergency fund, car purchase). Set a target amount and track your progress toward each goal. The platform shows you how much you\'ve saved and how much more you need. You can adjust goals anytime and monitor your savings journey with visual progress charts.'
    },
    {
      question: 'How does the loan tracking feature work?',
      answer: 'The "Loans" section allows you to record all personal loans and debts. Input the loan amount, interest rate, lender name, and repayment terms. Track your loan balance, remaining amount to pay, and payment history. The system helps you keep track of multiple loans, calculate interest, and plan your repayment strategy. You can monitor which loans need priority repayment.'
    },
    {
      question: 'What information is displayed on my Dashboard?',
      answer: 'Your Dashboard provides a comprehensive financial overview including total income, total expenses, net balance, budget status, savings progress, and loan details. It shows visual charts and graphs of your income vs. expenses, category-wise spending distribution, and savings goal progress. The dashboard gives you a quick snapshot of your financial health at a glance.'
    },
    {
      question: 'How secure is my financial data?',
      answer: 'Your account uses secure authentication with OTP verification during login. All data is encrypted and stored securely in our database. Your financial information is private and only accessible through your account. We recommend using a strong, unique password and keeping your login credentials confidential for maximum security.'
    },
    {
      question: 'Can I categorize transactions in different ways?',
      answer: 'Yes! You can create custom categories based on your needs. Go to the "Categories" section to add, edit, or delete categories. You can organize transactions by expense type, income source, or any custom classification you prefer. This flexibility helps you track finances according to your unique lifestyle and business needs.'
    },
    {
      question: 'How can I view my spending trends and analytics?',
      answer: 'Navigate to individual sections (Expenses, Income, Budgets, Savings) to see detailed analytics and trends. The dashboard displays charts showing spending patterns over time, category-wise breakdowns, income vs. expense comparisons, and savings progress. This data helps you identify spending trends and make better financial decisions.'
    },
    {
      question: 'What should I do if I forgot my password?',
      answer: 'Click on "Forgot Password" on the login page. Enter your registered email address, and we\'ll send you an OTP verification code. Once you verify the OTP, you can reset your password. This two-step verification process ensures only you can reset your account password, maintaining your account security.'
    },
    {
      question: 'How do I update my profile information?',
      answer: 'Click on your avatar or user menu in the navbar and select "Profile" to view and edit your account details. You can update your name, email, and other profile settings. Any changes are saved to your account immediately, and you can modify them anytime.'
    },
    {
      question: 'Can I set multiple savings goals?',
      answer: 'Yes! You can create unlimited savings goals. Each goal can have a different target amount, purpose, and timeline. Track progress for each goal separately, and celebrate achievements as you reach your milestones. This feature is perfect for planning multiple financial objectives simultaneously.'
    },
    {
      question: 'How do I logout from my account?',
      answer: 'Click on your avatar or user menu in the navbar and select "Logout". This will securely end your session and return you to the login page. Your data remains safe and secure, and you can log back in anytime with your credentials.'
    },
    {
      question: 'What if I have additional questions or need support?',
      answer: 'For any queries, concerns, or technical support, please contact us at bhardwajjshubh@gmail.com. Our support team will be happy to assist you with any questions about Money Manager functionality, account issues, or feature requests. We aim to respond to all inquiries promptly.'
    }
  ];

  const toggleFAQ = (index) => {
    setOpenIndex(openIndex === index ? -1 : index);
  };

  return (
    <div className="w-full bg-gradient-to-br from-gray-50 to-blue-50 min-h-screen">
      <div className="max-w-4xl mx-auto py-12 px-4">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
            Frequently Asked Questions
          </h1>
          <p className="text-gray-600 text-lg">
            Find answers to common questions about Money Manager and how to use our platform effectively.
          </p>
        </div>

      {/* FAQ Items */}
      <div className="space-y-4">
        {faqs.map((faq, index) => (
          <div
            key={index}
            className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-300"
          >
            <button
              onClick={() => toggleFAQ(index)}
              className="w-full px-6 py-5 flex items-center justify-between hover:bg-gray-50 transition-colors duration-200"
            >
              <h3 className="text-lg font-semibold text-gray-900 text-left">
                {faq.question}
              </h3>
              <svg
                className={`w-5 h-5 text-blue-600 transition-transform duration-300 flex-shrink-0 ml-4 ${
                  openIndex === index ? 'rotate-180' : ''
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            {/* Answer */}
            {openIndex === index && (
              <div className="px-6 py-5 bg-gradient-to-br from-blue-50 to-purple-50 border-t border-gray-200 animate-slideIn">
                <p className="text-gray-700 leading-relaxed">
                  {faq.answer}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Contact Section */}
      <div className="mt-16 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-8 border border-blue-200">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Still have questions?</h2>
        <p className="text-gray-700 mb-4">
          Can't find the answer you're looking for? Our support team is here to help.
        </p>
        <div className="flex items-center gap-3">
          <span className="text-lg">📧</span>
          <div>
            <p className="text-sm text-gray-600">Contact us at:</p>
            <a
              href="mailto:bhardwajjshubh@gmail.com"
              className="text-lg font-semibold text-blue-600 hover:text-blue-700 transition-colors"
            >
              bhardwajjshubh@gmail.com
            </a>
          </div>
        </div>
      </div>

      {/* Features Overview */}
      <div className="mt-16">
        <h2 className="text-2xl font-bold text-gray-900 mb-8">Key Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              title: 'Track Income',
              description: 'Log all sources of income and monitor your earnings over time'
            },
            {
              title: 'Manage Expenses',
              description: 'Categorize and track all your spending to understand your finances'
            },
            {
              title: 'Smart Budgeting',
              description: 'Set category-specific budgets and get alerts when approaching limits'
            },
            {
              title: 'Savings Goals',
              description: 'Create and track multiple savings goals with visual progress'
            },
            {
              title: 'Loan Management',
              description: 'Keep track of loans, interest rates, and repayment schedules'
            },
            {
              title: 'Financial Dashboard',
              description: 'View comprehensive charts and analytics of your financial health'
            }
          ].map((feature, index) => (
            <div
              key={index}
              className="bg-white p-6 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {feature.title}
              </h3>
              <p className="text-gray-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
      </div>
    </div>
  );
}
