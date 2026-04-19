const {
  success, created, error, unauthorized, forbidden, notFound, badRequest,
} = require('../../src/utils/response');

// Minimal express res mock
const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('Response Utils', () => {
  describe('success()', () => {
    it('sends 200 with success:true', () => {
      const res = mockRes();
      success(res, { id: 1 }, 'OK');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        message: 'OK',
        data: { id: 1 },
      }));
    });

    it('includes a timestamp', () => {
      const res = mockRes();
      success(res);
      const call = res.json.mock.calls[0][0];
      expect(call).toHaveProperty('timestamp');
      expect(() => new Date(call.timestamp)).not.toThrow();
    });
  });

  describe('created()', () => {
    it('sends 201', () => {
      const res = mockRes();
      created(res, { id: 'abc' });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });

  describe('error()', () => {
    it('sends 500 with success:false', () => {
      const res = mockRes();
      error(res, 'Something broke', 500);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false, message: 'Something broke' }));
    });

    it('includes errors array when provided', () => {
      const res = mockRes();
      error(res, 'Bad input', 422, ['field required']);
      const body = res.json.mock.calls[0][0];
      expect(body.errors).toEqual(['field required']);
    });
  });

  describe('unauthorized()', () => {
    it('sends 401', () => {
      const res = mockRes();
      unauthorized(res);
      expect(res.status).toHaveBeenCalledWith(401);
    });
  });

  describe('forbidden()', () => {
    it('sends 403', () => {
      const res = mockRes();
      forbidden(res);
      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe('notFound()', () => {
    it('sends 404', () => {
      const res = mockRes();
      notFound(res, 'User not found');
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'User not found' }));
    });
  });

  describe('badRequest()', () => {
    it('sends 400', () => {
      const res = mockRes();
      badRequest(res, 'Invalid email');
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });
});
