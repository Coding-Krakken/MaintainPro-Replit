import React from 'react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { render } from '@testing-library/react';

expect.extend(toHaveNoViolations);

describe('Basic Accessibility Tests', () => {
  it('should pass accessibility tests for basic HTML', async () => {
    const { container } = render(
      <div role="button" aria-label="Test button" tabIndex={0}>
        Click me
      </div>
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should pass accessibility tests for proper button', async () => {
    const { container } = render(
      <button type="button" aria-label="Test button">
        Click me
      </button>
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should check heading structure', async () => {
    const { container } = render(
      <div>
        <h1>Main Title</h1>
        <h2>Section Title</h2>
        <h3>Subsection Title</h3>
      </div>
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
