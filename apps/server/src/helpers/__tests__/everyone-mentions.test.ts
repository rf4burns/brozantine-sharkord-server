import { describe, expect, test } from 'bun:test';
import {
  hasEveryoneOrHereMention,
  stripEveryoneMentions
} from '../everyone-mentions';

describe('everyone-mentions', () => {
  test('should detect everyone and here mention spans', () => {
    expect(
      hasEveryoneOrHereMention(
        '<p><span data-type="mention" data-mention-kind="everyone">@everyone</span></p>'
      )
    ).toBe(true);
    expect(
      hasEveryoneOrHereMention(
        '<p><span data-mention-kind="here" data-type="mention">@here</span></p>'
      )
    ).toBe(true);
    expect(
      hasEveryoneOrHereMention(
        '<p><span data-type="mention" data-user-id="1">@user</span></p>'
      )
    ).toBe(false);
  });

  test('should strip everyone and here mention spans to plain text', () => {
    expect(
      stripEveryoneMentions(
        '<p><span data-type="mention" data-mention-kind="everyone">@everyone</span></p>'
      )
    ).toBe('<p>@everyone</p>');
    expect(
      stripEveryoneMentions(
        '<p><span data-type="mention" data-mention-kind="here">@here</span></p>'
      )
    ).toBe('<p>@here</p>');
  });
});
