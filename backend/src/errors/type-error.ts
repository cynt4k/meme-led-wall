export class TypeError extends Error {
    public params: Array<any>;

    constructor(message: string, params: Array<any>) {
        super(message);
        this.params = params;
    }
}
