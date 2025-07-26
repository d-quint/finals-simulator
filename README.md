# Finals Simulator 📚

A modern, sleek exam/quiz system with LaTeX support for creating and taking tests. Built with Bootstrap 5 and featuring real-time LaTeX rendering.

## 🌟 Features

### Question Creator Interface
- **Modern UI/UX** with Bootstrap 5 and custom animations
- **Real-time LaTeX preview** using MathJax
- **Configurable question sets** with parameters:
  - Question set name
  - Subject
  - Time limit
  - Answer change permissions
- **JSON export** for portability
- **Question management** (add, edit, delete)
- **Support for 4-5 multiple choice options**

### Test Taking Interface
- **Professional test environment** with timer
- **LaTeX equation rendering** in questions
- **Floating scantron button** for quick access to answer sheet
- **Scantron-style answer interface** with bubble selection
- **Question navigation** with visual progress indicators
- **Keyboard shortcuts** for navigation
- **Auto-submit** when time expires
- **Detailed results** with score breakdown
- **Prevent accidental page refresh** during tests

## 🚀 Getting Started

1. **Open the application**: Double-click `index.html` or serve it using a local web server
2. **Create questions**: Click "Create Questions" to access the Question Creator
3. **Take tests**: Click "Take Test" to load and take exam questions

## 📝 Creating Question Sets

1. Navigate to the **Question Creator** interface
2. Fill in the **question set configuration**:
   - Question Set Name (e.g., "Calculus Final Exam")
   - Subject (e.g., "Mathematics")
   - Time Limit in minutes
   - Whether answer changes are allowed
3. **Add questions** with LaTeX support:
   - Type questions with LaTeX equations (e.g., `$x^2 + y^2 = z^2$`)
   - See **real-time preview** of rendered equations
   - Add 4-5 multiple choice options
   - Select the correct answer
4. **Export to JSON** when complete

### LaTeX Examples
- Inline math: `$\frac{a}{b}$` or `$x^2 + y^2 = z^2$`
- Display math: `$$\int_0^\infty e^{-x} dx$$`
- Complex expressions: `$\lim_{x \to 0} \frac{\sin x}{x} = 1$`

## 🎯 Taking Tests

1. Navigate to the **Test Interface**
2. **Load a question set** by selecting a JSON file
3. **Review test information** (name, subject, time limit, questions)
4. **Start the test** - timer begins automatically
5. **Navigate questions** using:
   - Navigation buttons (Previous/Next)
   - Question number buttons
   - Keyboard arrows
   - Floating scantron interface
6. **Select answers** by clicking options or using number keys (1-5)
7. **Submit test** manually or let it auto-submit when time expires
8. **Review detailed results** with correct/incorrect breakdown

## 🎨 Interface Features

### Scantron Interface
- **Floating button** provides quick access to answer sheet
- **Grid layout** shows all questions and answer choices
- **Visual feedback** with selected answer highlighting
- **Progress tracking** with completion percentage

### Visual Indicators
- **Question navigation**: Current (blue), Answered (green), Unanswered (gray)
- **Timer warnings**: Changes color and pulses when 5 minutes remain
- **Progress bars**: Show completion status throughout test
- **Toast notifications**: Success, error, and warning messages

## 📁 File Structure

```
finals-simulator/
├── index.html              # Main menu/landing page
├── creator.html            # Question creation interface
├── test.html              # Test taking interface
├── styles/
│   └── main.css           # Modern styling and animations
├── js/
│   ├── creator.js         # Question creator functionality
│   └── test.js           # Test interface functionality
└── sample-questions/
    └── calculus-sample.json # Sample question set
```

## 🔧 Technical Details

### Dependencies
- **Bootstrap 5.3.0** - UI framework
- **Font Awesome 6.4.0** - Icons
- **MathJax 3** - LaTeX rendering

### Browser Support
- Modern browsers with ES6+ support
- Tested on Chrome, Firefox, Safari, Edge

### JSON Format
Question sets are exported in a structured JSON format:
```json
{
  "metadata": {
    "name": "Test Name",
    "subject": "Subject",
    "timeLimit": 60,
    "allowAnswerChange": true,
    "totalQuestions": 10
  },
  "questions": [
    {
      "id": 1234567890,
      "question": "Question text with $\\LaTeX$",
      "options": {
        "A": "Option A",
        "B": "Option B",
        "C": "Option C",
        "D": "Option D",
        "E": "Option E (optional)"
      },
      "correctAnswer": "A"
    }
  ]
}
```

## 🎓 Sample Usage

A sample Calculus question set is included in `sample-questions/calculus-sample.json`. This demonstrates:
- LaTeX equations in questions
- Mathematical notation
- Proper JSON structure
- Various question types

## 📱 Responsive Design

The interface is fully responsive and works on:
- Desktop computers
- Tablets
- Mobile phones
- Various screen sizes

## 🔒 Security Features

- **Prevent cheating**: Page refresh warnings during active tests
- **Time enforcement**: Automatic submission when time expires
- **Answer validation**: Prevents invalid selections
- **Configuration enforcement**: Respects answer change permissions

## 🤝 Contributing

Feel free to enhance the application with additional features such as:
- Question categories/tags
- Randomized question order
- More question types (true/false, fill-in-the-blank)
- Grade curves and statistics
- User authentication
- Question banks

## 📄 License

This project is open source and available under the MIT License.

---

**Happy Testing! 🎉**
