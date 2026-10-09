import { ApiError, NetworkError, ValidationError } from '@/api/errors';
import { applyServerErrors } from '@/forms/applyServerErrors';

type Form = { email: string; password: string };

test('field errors go to their fields, unknown keys become the form message', () => {
  const setError = jest.fn();
  const error = new ValidationError('Bad', { email: ['Taken.'], invitation: ['No longer available.'] });

  const message = applyServerErrors<Form>(error, setError, ['email', 'password']);

  expect(setError).toHaveBeenCalledWith('email', { type: 'server', message: 'Taken.' });
  expect(message).toBe('No longer available.');
});

test('non-validation errors become the form message', () => {
  const setError = jest.fn();

  expect(applyServerErrors<Form>(new NetworkError(), setError, ['email'])).toBe("Can't reach Marvelous Games. Check your connection.");
  expect(applyServerErrors<Form>(new ApiError(403, 'Forbidden.'), setError, ['email'])).toBe('Forbidden.');
  expect(applyServerErrors<Form>(new Error('boom'), setError, ['email'])).toBe('Something went wrong. Please try again.');
  expect(setError).not.toHaveBeenCalled();
});
