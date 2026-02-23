# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a single-page web application for tracking student material distribution at 하늘고 (Haneulgo school). The application is built as a standalone HTML file with embedded CSS and JavaScript - no build process or dependencies required.

## Architecture

**Single-File Structure**: The entire application is contained in `index.html` with:
- Inline CSS (lines ~7-620): Styling with responsive design for mobile devices
- Inline JavaScript (lines ~777-1524): Application logic using vanilla JavaScript
- HTML structure (lines ~622-775): UI layout including modal forms

**Data Management**:
- **Firebase Integration**: Optional Firebase Realtime Database for cross-device synchronization
  - Falls back to localStorage if Firebase is not configured or fails
  - Firebase config at lines 779-787 (currently configured)
  - `useFirebase` flag controls which storage backend is used
- **localStorage Keys**:
  - `studentChecklist`: Stores weekly check status per student (`checkedStudents` object)
  - `studentsData`: Stores the entire students array with modifications
- **Initial Data**: `defaultStudents` array (lines 830-872) contains 31 hardcoded students
- **Active Data**: `students` array holds current working data, loaded from Firebase/localStorage on startup
- Student numbers are auto-generated as `max(grade_nums) + 1`

**Key Data Structures**:
```javascript
students = [
  {grade: 1, num: 1, name: "이름", class: "1반", subjects: ["국어", "영어"], phone: "010-xxxx-xxxx", parentPhone: "010-xxxx-xxxx"}
]
checkedStudents = {
  "2025-W43": {1: true, 2: false, ...}  // week -> student num -> checked
}
```

## Running the Application

Simply open `index.html` in a web browser. No build process, no server required.

## Testing

The project uses Playwright for end-to-end testing. Tests are organized by feature area in the `tests/` directory.

**Running Tests**:
```bash
npm test                # Run all tests
npm run test:headed     # Run with browser visible
npm run test:debug      # Debug mode with step-through
npm run test:ui         # Interactive UI mode
npm run test:report     # View test report
```

**Test Files**:
- `student-management.spec.js`: Adding and deleting students
- `check-functionality.spec.js`: Checkbox state and persistence
- `subject-editing.spec.js`: Adding/removing subjects
- `search-filter.spec.js`: Search and filtering features
- `week-persistence.spec.js`: Week-based data storage
- `bulk-operations.spec.js`: Check all, uncheck all, reset
- `helpers.js`: Shared test utilities

**Important**: Tests run sequentially (workers: 1) to avoid localStorage conflicts between test cases.

## Core Features

1. **Week-based Tracking**: Select a week to track material distribution status per student
2. **Student Management**:
   - Add new students via modal form (name, grade, class, number, subjects, phone)
   - Delete students in edit mode
   - Dynamic student count with automatic statistics updates
3. **Subject Editing**: Add/remove subjects for each student in edit mode
4. **Search & Filter**:
   - Text search by name/class/subject
   - Grade filter (1학년, 2학년, or all)
   - Class filter dropdown (dynamically populated from student data)
5. **Bulk Operations**: Check all, uncheck all, reset week data
6. **Auto-save**: All changes automatically saved to localStorage

## Key Functions

**Rendering & UI**:
- `renderStudents()`: Main rendering function that populates tables and sorts by grade > class > number (lines 950-985)
- `createStudentRow(student, isChecked, rowIndex)`: Creates table rows with conditional delete buttons in edit mode (lines 987-1035)
- `updateStats()`: Updates completion statistics with dynamic student counts (lines 1060-1086)
- `updateClassFilter()`: Dynamically populates class filter dropdown from student data (lines 1178-1200)

**Data Persistence**:
- `loadStudentsData()`: Loads students from Firebase (preferred) or localStorage fallback (lines 1351-1378)
- `saveStudentsData()`: Saves students array to Firebase or localStorage (lines 1333-1349)
- `loadWeekData()`: Loads check data for selected week from Firebase/localStorage (lines 1088-1118)
- `saveToLocalStorage()`: Saves check data to Firebase or localStorage (lines 1121-1137)
- `setupFirebaseListeners()`: Sets up real-time synchronization listeners for Firebase (lines 905-934)

**Student Management**:
- `openAddStudentModal()`: Opens the student addition modal form (lines 1428-1430)
- `addStudent(event)`: Processes form submission, validates data, adds student to array (lines 1446-1498)
- `deleteStudent(studentNum, studentName)`: Removes student and associated check data (lines 1501-1523)
- `resetToDefaultStudents()`: Resets all student data to `defaultStudents` array (lines 1394-1425)

**Check Management**:
- `toggleCheck(studentNum)`: Handles checkbox state and saves to storage (lines 1037-1058)
- `checkAll()`: Checks all students for current week (lines 1221-1231)
- `uncheckAll()`: Unchecks all students for current week (lines 1233-1243)
- `resetWeek()`: Shows confirmation dialog for resetting week data (lines 1245-1259)

**Subject Editing**:
- `toggleEditMode()`: Enables/disables subject editing mode (lines 1261-1267)
- `handleSubjectClick(studentNum, subject)`: Removes subjects when in edit mode (lines 1269-1282)
- `showAddSubject(studentNum)`: Shows inline input for adding subject (lines 1284-1309)
- `addSubject(studentNum, subjectName)`: Adds new subjects to students (lines 1311-1326)

**Filtering & Search**:
- `searchStudents()`: Real-time text search by name/class/subject (lines 1147-1155)
- `filterGrade(grade)`: Shows/hides grade sections (lines 1157-1175)
- `filterByClass()`: Filters visible rows by selected class (lines 1203-1219)
- `extractClassNumber(classStr)`: Extracts numeric value from class strings (e.g., "1반" → 1) (lines 945-948)

**Utility**:
- `getWeekNumber(date)`: Calculates ISO week number from date (lines 936-942)
- `showSaveIndicator()`: Shows temporary save confirmation (lines 1139-1145)
- `updateFirebaseStatus(connected)`: Updates UI to show Firebase connection status (lines 814-827)

## State Management

The application has these main global states:
- `students` (array): Active student list, loaded from Firebase/localStorage on startup
- `defaultStudents` (array): Hardcoded backup of 31 initial students (lines 830-872)
- `checkedStudents` (object): Week-based check status `{week: {studentNum: boolean}}`
- `currentWeek` (string): Currently selected week in ISO format (e.g., "2025-W43")
- `editMode` (boolean): Controls whether subject/student editing is enabled
- `editingStudent` (number|null): Tracks which student is currently having subjects edited
- `useFirebase` (boolean): Whether Firebase is successfully initialized and should be used
- `database` (Firebase reference|null): Firebase database reference if available

## Modifying Student Data

**Via UI** (Recommended):
- Click "+ 학생 추가" button to add students through the modal form
- Click "과목 편집" button to enter edit mode, then:
  - Click "삭제" buttons next to student names to remove students
  - Click subject tags to remove subjects
  - Click "+ 추가" to add new subjects
- Click "🔄 학생 데이터 초기화" to reset to `defaultStudents`
- All changes are automatically saved to Firebase (if configured) or localStorage

**Via Code**:
- Initial student data is defined in `defaultStudents` array (lines 830-872)
- On first load, if no saved data exists in Firebase/localStorage, `defaultStudents` is used
- Subsequent modifications are loaded from Firebase (preferred) or localStorage (fallback)
- Each student object requires: `grade`, `num`, `name`, `class`, `subjects` (array), `phone`, `parentPhone`
- Student numbers (`num`) are unique identifiers used for checkbox IDs and data references

## Firebase Configuration

The application supports optional Firebase Realtime Database for cross-device synchronization:

**Setup**:
- Firebase config is at lines 779-787 in `index.html`
- Currently configured with a working Firebase project
- See `FIREBASE_SETUP.md` for detailed setup instructions

**Behavior**:
- If Firebase is configured and connects successfully: Uses Firebase for all data storage with real-time sync
- If Firebase fails or is not configured: Falls back to localStorage automatically
- The app displays a status indicator showing which mode is active

**Firebase Database Structure**:
```
/students: Array of student objects
/checkedStudents: Object with week keys containing student check status
```

## Korean Language Context

All UI text is in Korean:
- "배부완료" = Distribution Complete
- "신청 과목" = Registered Subjects
- "과목 편집" = Edit Subjects
- "학생 추가" = Add Student
- "전체 체크" = Check All
- "전체 해제" = Uncheck All
- "초기화" = Reset
- Interface is designed for Korean school system (반 = class, 학년 = grade)

## Deployment

Since this is a static HTML file with no build process, deployment is simple:

**Quick Options**:
- **Netlify Drop**: Drag `index.html` to https://app.netlify.com/drop
- **GitHub Pages**: Push to repo, enable Pages in Settings
- **Vercel**: Upload file or connect GitHub repo

No configuration needed - just upload the single `index.html` file.

**Note**: Firebase configuration is included in the HTML file. For production use, consider securing Firebase rules to restrict write access.
