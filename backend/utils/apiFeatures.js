class APIFeatures {
  constructor(query, queryString) {
    this.query = query;
    this.queryString = queryString;
  }

  filter() {
    const queryObj = { ...this.queryString };
    const excludedFields = ["page", "sort", "limit", "fields"];
    excludedFields.forEach((el) => delete queryObj[el]);

    // 1B) Advanced filtering (only safe operators, never raw $ operators)
    const operators = ["gte", "gt", "lte", "lt", "ne", "in"];
    const filterObj = {};

    Object.entries(queryObj).forEach(([field, value]) => {
      if (field.startsWith("$")) return;

      if (value && typeof value === "object" && !Array.isArray(value)) {
        const conditions = {};

        Object.entries(value).forEach(([operator, operand]) => {
          if (!operators.includes(operator)) return;

          conditions[`$${operator}`] =
            operator === "in" ? `${operand}`.split(",") : operand;
        });

        if (Object.keys(conditions).length) filterObj[field] = conditions;
        return;
      }

      filterObj[field] = value;
    });

    this.query = this.query.find(filterObj);

    return this;
  }

  sort() {
    if (this.queryString.sort) {
      const sortBy = this.queryString.sort.split(",").join(" ");
      this.query = this.query.sort(sortBy);
    } else {
      this.query = this.query.sort("-createdAt");
    }

    return this;
  }

  limitFields() {
    if (this.queryString.fields) {
      const fields = this.queryString.fields
        .split(",")
        .filter((el) => !el.startsWith("+"))
        .join(" ");
      this.query = this.query.select(fields);
    } else {
      this.query = this.query.select("-__v");
    }

    return this;
  }

  paginate() {
    const page = this.queryString.page * 1 || 1;
    // Cap the page size so every page stays fast
    const limit = Math.min(this.queryString.limit * 1 || 100, 500);
    const skip = (page - 1) * limit;

    this.query = this.query.skip(skip).limit(limit);

    return this;
  }
}
export default APIFeatures;
