# Bug Fix: Slow Typing and Input Lag in the Row Annotation Interface

## Problem Description

I noticed a performance issue when adding annotations to selected rows in the Interactive Data Table.

### Steps to reproduce

1. Open the Data Table.
2. Select one or multiple rows.
3. Choose the action to add an annotation to the selected rows.
4. Focus on the annotation text field.
5. Start typing an annotation.

### Current behavior

Typing in the annotation field feels noticeably delayed and unresponsive.

For example, I can finish typing a word using my keyboard, but the text field takes additional time to catch up and display the characters I have already entered.

The input does not respond naturally or immediately as expected from a normal text field. It feels as though the application is processing something in the background for every character typed.

This makes composing annotations frustrating, especially when entering longer notes.

## Expected Behavior

The annotation text field should respond immediately to keyboard input.

- Characters should appear as soon as they are typed.
- Typing should feel smooth and natural, without noticeable delays.
- The input should remain responsive regardless of how many rows are selected.
- Composing longer annotations should not cause progressively worse typing performance.
- The annotation interface should not unnecessarily re-render or process unrelated parts of the Data Table while the user is typing.

## Investigation Requirements

Before making changes, inspect the existing annotation implementation and identify the actual cause of the input lag.

Pay particular attention to the following possibilities:

1. **Unnecessary component re-rendering:** Check whether every keystroke causes the entire Data Table, selected rows, annotation modal, or other unrelated components to re-render.

2. **Expensive state updates:** Determine whether typing triggers updates to the entire dataset or large collections of selected records instead of updating only the annotation input's local state.

3. **Synchronous processing:** Check whether filtering, validation, annotation processing, data transformations, or other expensive operations are executed on every keystroke.

4. **Component dependencies:** Inspect whether the annotation field depends on large parent components or frequently changing state that causes unnecessary updates.

5. **Event handlers and effects:** Check whether input event handlers, callbacks, or effects trigger expensive computations or repeated state synchronization.

6. **Large selection handling:** Determine whether the typing delay becomes worse as the number of selected rows increases.

7. **Controlled input implementation:** Verify that the input's value and state updates are implemented efficiently and do not introduce unnecessary delays.

These are possible causes to investigate, not assumptions about the actual implementation.

## Implementation Requirements

- Keep the annotation input responsive by avoiding unnecessary work during each keystroke.
- Separate temporary text input state from the actual annotation-saving operation where appropriate.
- Avoid updating the entire dataset while the user is still composing an annotation.
- Perform annotation validation and commit operations at appropriate points, such as when the user saves the annotation, rather than unnecessarily on every character.
- Ensure that optimizing the annotation input does not break existing annotation functionality.
- Preserve support for both row-level and cell-level annotations, where applicable.
- Preserve the existing annotation interface, styling, and user experience unless a change is necessary to fix the issue.
- Follow the application's existing architecture and state-management conventions.

## Performance Verification

Test the annotation interface under different conditions:

1. Add an annotation to a single selected row.
2. Add an annotation to multiple selected rows.
3. Repeat the test with a relatively large number of selected rows.
4. Type short and long annotations.
5. Type continuously, including rapid typing, deleting, and editing existing text.
6. Open and close the annotation interface repeatedly.

Verify that:

- Text appears immediately as the user types.
- There is no noticeable input lag.
- Typing responsiveness does not significantly degrade as the number of selected rows increases.
- Saving annotations still applies them to the correct selected records.
- Existing annotations can still be viewed, edited, and deleted.
- Other Data Table operations remain unaffected.

## Implementation Approach

1. Inspect the current implementation and identify the root cause.
2. Explain the cause briefly before or alongside the proposed fix.
3. Implement the smallest appropriate performance improvement.
4. Add or update tests where practical to prevent the issue from returning.
5. Verify that existing annotation behavior and related Data Table functionality remain intact.

Do not simply add debouncing to the text field as a workaround without investigating the underlying cause. The goal is to eliminate unnecessary processing and restore normal typing responsiveness.

**Important:** Prioritize the responsiveness of the annotation input itself. The user should be able to type naturally without waiting for the application to catch up.
