import { Path, Accept, GET, POST, Param, Security, PathParam, PUT } from 'typescript-rest';
import { Tags, Response, Example, IsLong } from 'typescript-rest-swagger';

export interface IResponse<T> {
    status: string;
    code: number;
    message: string;
    data: T;
}

export interface IResponseNone {
    status: string;
    code: number;
    message: string;
}

export interface IUserLoginToken {
    token: string;
}

export interface IUserLogin {
    username: string;
    password: string;
    unlimited?: boolean;
}

export interface IUser {
    username: string;
    name: {
        firstname: string;
        lastname: string;
    };
}

export interface IApiMemeUpload {
    name: string;
    meme: any;
}

export interface IApiShowMeme {
    name: string;
}

@Path('v1/auth')
export class Auth {
    @Path('login')
    @POST
    @Tags('auth')
    @Accept('application/json')
    @Response<IResponse<IUserLoginToken>>(200, 'Return the login token')
    // @ts-ignore
    loginUser(login: IUserLogin): IResponse<IUserLoginToken> { }
}


@Path('v1/meme')
export class Meme {
    @Path('show')
    @POST
    @Tags('meme')
    @Accept('application/json')
    @Response<IResponseNone>(200, 'Show an meme by its filename')
    // @ts-ignore
    showMeme(meme: IApiShowMeme): IResponseNone { }


    @Path('upload')
    @POST
    @Tags('meme')
    @Accept('application/x-www-form-urlencoded')
    @Response<IResponseNone>(200, 'Upload an meme to the controller')
    // @ts-ignore
    uploadMeme(meme: IApiMemeUpload): IResponseNone { }
}
