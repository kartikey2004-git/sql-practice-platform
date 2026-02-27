import mongoose, { Schema, Document } from "mongoose";

export interface IColumn {
  columnName: string;
  dataType: string;
}

export interface ITable {
  tableName: string;
  columns: IColumn[];
  rows: Record<string, any>[];
}

export interface IExpectedOutput {
  type: string;
  value: any;
}

export interface IAssignment extends Document {
  title: string;
  description: string;
  question: string;
  sampleTables: ITable[];
  expectedOutput: IExpectedOutput;
  createdAt: Date;
  updatedAt: Date;
}

const ColumnSchema = new Schema<IColumn>({
  columnName: {
    type: String,
    required: true
  },
  dataType: {
    type: String,
    required: true
  },
});

const TableSchema = new Schema<ITable>({
  tableName: {
    type: String,
    required: true
  },
  columns: [ColumnSchema],
  rows: [
    {
      type: Schema.Types.Mixed
    }
  ],
});

const ExpectedOutputSchema = new Schema<IExpectedOutput>({
  type: {
    type: String,
    required: true
  },
  value: {
    type: Schema.Types.Mixed,
    required: true
  },
});

const AssignmentSchema = new Schema<IAssignment>(
  {
    title: {
      type: String,
      required: true
    },
    description: {
      type: String,
      required: false
    },
    question: {
      type: String,
      required: true
    },
    sampleTables: [TableSchema],
    expectedOutput: {
      type: ExpectedOutputSchema,
      required: true
    },
  },
  {
    timestamps: true,
  },
);

export const Assignment = mongoose.model<IAssignment>(
  "Assignment",
  AssignmentSchema,
);
