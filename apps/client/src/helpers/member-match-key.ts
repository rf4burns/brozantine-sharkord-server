const memberMatchKey = (member: {
  name: string;
  identity?: string | null;
  _identity?: string | null;
}) => {
  const identity = (member.identity || member._identity || '').trim();

  if (identity) {
    return identity.toLowerCase();
  }

  return member.name.trim().toLowerCase();
};

export { memberMatchKey };
