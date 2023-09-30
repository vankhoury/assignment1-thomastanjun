import Cell from "./Cell"
import SheetMemory from "./SheetMemory"
import { ErrorMessages } from "./GlobalDefinitions";



export class FormulaEvaluator {
  // Define a function called update that takes a string parameter and returns a number
  private _errorOccured: boolean = false;
  private _errorMessage: string = "";
  private _currentFormula: FormulaType = [];
  private _lastResult: number = 0;
  private _sheetMemory: SheetMemory;
  private _result: number = 0;


  constructor(memory: SheetMemory) {
    this._sheetMemory = memory;
  }

  /**
    * place holder for the evaluator.   I am not sure what the type of the formula is yet 
    * I do know that there will be a list of tokens so i will return the length of the array
    * 
    * I also need to test the error display in the front end so i will set the error message to
    * the error messages found In GlobalDefinitions.ts
    * 
    * according to this formula.
    * 
    7 tokens partial: "#ERR",
    8 tokens divideByZero: "#DIV/0!",
    9 tokens invalidCell: "#REF!",
  10 tokens invalidFormula: "#ERR",
  11 tokens invalidNumber: "#ERR",
  12 tokens invalidOperator: "#ERR",
  13 missingParentheses: "#ERR",
  0 tokens emptyFormula: "#EMPTY!",

                    When i get back from my quest to save the world from the evil thing i will fix.
                      (if you are in a hurry you can fix it yourself)
                               Sincerely 
                               Bilbo
    * 
   */

  evaluate(formula: FormulaType)  {
    // set the this._result to the length of the formula

    
    let parenthesesCount = 0;
    let operatornum = 0;
    let numberCount = 0;

    let messageIndicator = 1;
    const operators: string[] = [];
    const values: number[] = [];

    function calculate(){
      const operator = operators.pop();
      const left: number = values.pop()!;
      const right: number = values.pop()!;

      switch(operator){
        case "+":
          values.push(left + right);
          break;
        case "-":
          values.push(right - left);
          break;
        case "*":
          values.push(left * right);
          break;
        case "/":
          if (left == 0){
            messageIndicator = 8;
            break;
          }
          values.push(right / left);
          break;
      }
    }

    for (let i = 0; i < formula.length; i++) {
      let token = formula[i];

      if (token == "(") {
        if (i != 0) {
          let prevtoken = formula[i - 1];
          if (this.isOperator(prevtoken) != true && prevtoken != "(") {
            messageIndicator = 12;
            break;
          }
        }
        parenthesesCount++; 
        operators.push(token);
      }
      else if (token == ")") {
        if (parenthesesCount == 0) {
          messageIndicator = 13;
          break;
        }
        else if (formula[i-1] == "(") {
          parenthesesCount--;
          messageIndicator = 13;
          break;
        }
        while (operators[operators.length - 1] != "(") {
          calculate();
        }
        operators.pop();
        parenthesesCount--;
      }
      else if (this.isOperator(token) == true) {
        operatornum++;
        if (i == 0 || i == formula.length - 1) {
          messageIndicator = 10;
          break;
        }
        else{
          let prevtoken = formula[i - 1];
          let nexttoken = formula[i + 1];
          if (this.isOperator(prevtoken) == true || this.isOperator(nexttoken) == true) {
            messageIndicator = 12;
            break;
          }
          if ((token == '+' || token == '-' && operators.length > 0) && (operators[operators.length - 1] == '*'
            || operators[operators.length - 1] == '/')) {
            calculate();
          }
          operators.push(token);
        }
      }
      else if (formula.length > 1 && this.isCellReference(token) == true) {
        if (i == 0 ) {
          if (this.isOperator(formula[i + 1]) != true) {
            messageIndicator = 10;
            break;
          }
        }
        else if (i == formula.length - 1) {
          if (this.isOperator(formula[i - 1]) != true) {
            messageIndicator = 10;
            break;
          }
        }
        else {
          let prevtoken = formula[i - 1];
          let nexttoken = formula[i + 1];
          if (this.isOperator(prevtoken) != true || this.isOperator(nexttoken) != true) {
            messageIndicator = 9;
            break;
          }
        }
        values.push(this.getCellValue(token)[0]);
      }
      else if (formula.length == 1 && this.isCellReference(token) == true) {
        values.push(this.getCellValue(token)[0]);
      }
      else if (this.isNumber(token) == true) {
        values.push(Number(token));
      }
    }
    
    if (formula.length == 0) {
      messageIndicator = 0;
    }

    if (parenthesesCount != 0) {
      messageIndicator = 13;
    }

    while (operators.length > 0) {
      calculate();
    }
    
    if (values.length == 1) {
      this._result = values.pop()!;
    }
    else {
      this._result = 0;
    }

    if (parenthesesCount == 0 && messageIndicator == 13) {
      this._result = 0;
    }
    
    this._errorMessage = "";

    switch (messageIndicator) {
      case 0:
        this._errorMessage = ErrorMessages.emptyFormula;
        break;
      case 7:
        this._errorMessage = ErrorMessages.partial;
        break;
      case 8:
        this._errorMessage = ErrorMessages.divideByZero;
        this._result = Infinity;
        break;
      case 9:
        this._errorMessage = ErrorMessages.invalidCell;
        break;
      case 10:
        this._errorMessage = ErrorMessages.invalidFormula;
        break;
      case 11:
        this._errorMessage = ErrorMessages.invalidNumber;
        break;
      case 12:
        this._errorMessage = ErrorMessages.invalidOperator;
        break;
      case 13:
        this._errorMessage = ErrorMessages.missingParentheses;
        break;
      default:
        this._errorMessage = "";
        break;
    }
  }

  public get error(): string {
    return this._errorMessage
  }

  public get result(): number {
    return this._result;
  }

  /**
   * 
   * @param token 
   * @returns true if the token is an operator
   */
  isOperator(token: TokenType): boolean {
    return token === "+" || token === "-" || token === "*" || token === "/";
  }

  /**
   * 
   * @param token 
   * @returns true if the toke can be parsed to a number
   */
  isNumber(token: TokenType): boolean {
    return !isNaN(Number(token));
  }

  /**
   * 
   * @param token
   * @returns true if the token is a cell reference
   * 
   */
  isCellReference(token: TokenType): boolean {

    return Cell.isValidCellLabel(token);
  }

  /**
   * 
   * @param token
   * @returns [value, ""] if the cell formula is not empty and has no error
   * @returns [0, error] if the cell has an error
   * @returns [0, ErrorMessages.invalidCell] if the cell formula is empty
   * 
   */
  getCellValue(token: TokenType): [number, string] {

    let cell = this._sheetMemory.getCellByLabel(token);
    let formula = cell.getFormula();
    let error = cell.getError();

    // if the cell has an error return 0
    if (error !== "" && error !== ErrorMessages.emptyFormula) {
      return [0, error];
    }

    // if the cell formula is empty return 0
    if (formula.length === 0) {
      return [0, ErrorMessages.invalidCell];
    }


    let value = cell.getValue();
    return [value, ""];

  }


}

export default FormulaEvaluator;