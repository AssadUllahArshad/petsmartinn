export function AmazonPriceNotice({
  syncedAt,
}: {
  syncedAt?: Date | string | null;
}) {
  return (
    <small className="card-disclosure">
      {syncedAt
        ? `Amazon price and availability as of ${new Date(syncedAt).toISOString()} (UTC). `
        : ""}
      Price and availability are subject to change. The price and availability
      shown on Amazon at purchase apply.
    </small>
  );
}
