/**
 * Landing page: renders hero, event code input, and continue button.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LandingPage from '@/app/page';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

describe('Landing page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock fetch so useEffect(/api/auth/me) resolves and form is shown (no user => setCheckingSession(false))
    global.fetch = jest.fn(() =>
      Promise.resolve({ json: () => Promise.resolve({}) })
    ) as jest.Mock;
  });

  it('renders Echo Room title and event code form', async () => {
    render(<LandingPage />);
    await screen.findByRole('heading', { name: /echo room/i });
    expect(screen.getByPlaceholderText(/e\.g\. SMARTCITY/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /continue/i })).toBeInTheDocument();
  });

  it('has accessible label for event code input', async () => {
    render(<LandingPage />);
    await screen.findByRole('heading', { name: /echo room/i });
    const input = screen.getByLabelText(/enter event code/i);
    expect(input).toBeInTheDocument();
  });

  it('continue button is disabled when code is empty', async () => {
    render(<LandingPage />);
    await screen.findByRole('heading', { name: /echo room/i });
    const btn = screen.getByRole('button', { name: /continue/i });
    expect(btn).toBeDisabled();
  });

  it('enables continue when code is entered', async () => {
    const user = userEvent.setup();
    render(<LandingPage />);
    await screen.findByRole('heading', { name: /echo room/i });
    const input = screen.getByLabelText(/enter event code/i);
    await user.type(input, 'ABC');
    const btn = screen.getByRole('button', { name: /continue/i });
    expect(btn).not.toBeDisabled();
  });
});
